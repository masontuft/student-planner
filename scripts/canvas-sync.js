// Canvas ICS feed support: fetches the feed through the Netlify proxy
// (to bypass Canvas's missing CORS headers), parses it, and merges
// assignments into the shared task list. DOM-free so any page can sync.
import { loadTasks, saveTasks, getTodayStr } from "./utils.js";

const CORS_PROXY = "/.netlify/functions/ics?url=";
const FEED_URL_KEY = "canvas_feed_url";

// --- Feed URL storage ---

export function getFeedUrl() {
  return localStorage.getItem(FEED_URL_KEY) || null;
}

// Returns false when the write fails (private browsing, quota exceeded).
export function setFeedUrl(url) {
  try {
    localStorage.setItem(FEED_URL_KEY, url);
    return true;
  } catch {
    return false;
  }
}

export function clearFeedUrl() {
  localStorage.removeItem(FEED_URL_KEY);
}

// --- ICS fetch ---

export async function fetchICS(feedUrl) {
  const res = await fetch(CORS_PROXY + encodeURIComponent(feedUrl));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Proxy request failed (${res.status})`);
  }
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Response is not a valid ICS calendar.");
  return text;
}

// --- ICS parser ---
// Handles RFC 5545 line folding (continuation lines start with a space/tab).

export function parseICS(text) {
  // Unfold folded lines
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n|\r/);

  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    // Split on first colon, ignoring parameter sections (KEY;PARAM=val:VALUE)
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const rawKey = line.slice(0, colonIdx);
    const value  = line.slice(colonIdx + 1).trim();

    // Strip parameters (e.g. DTSTART;TZID=America/Denver → DTSTART)
    const key = rawKey.split(";")[0].toUpperCase();
    current[key] = value;
  }

  return events;
}

// Parses a DTSTART/DTEND value to a YYYY-MM-DD string.
// Handles both all-day (20260613) and datetime (20260613T060000Z) forms.
export function icsDateToYMD(value) {
  if (!value) return null;
  const clean = value.replace(/^.*:/, "");
  const digits = clean.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// Converts a Canvas calendar URL to a direct assignment URL.
// Canvas ICS URL field: /calendar?event_id=assignment_<assignmentId>_<courseId>
// Direct assignment URL: /courses/<courseId>/assignments/<assignmentId>
// Non-http(s) or unparsable URLs return "" so they never reach an href.
export function canvasDirectUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const courseId = (new URLSearchParams(parsed.search).get("include_contexts") || "").replace("course_", "");
    const assignId = parsed.hash.replace("#assignment_", "");
    if (courseId && assignId && /^\d+$/.test(courseId) && /^\d+$/.test(assignId))
      return `https://${parsed.hostname}/courses/${courseId}/assignments/${assignId}`;
    return url;
  } catch {
    return "";
  }
}

// Canvas puts "[Course Code]" at the end of assignment summaries.
// e.g. "Chapter 5 Quiz [WDD 231]" → { name: "Chapter 5 Quiz", course: "WDD 231" }
export function parseSummary(summary) {
  const match = summary.match(/^(.+?)\s*\[(.+?)\]\s*$/);
  if (match) return { name: match[1].trim(), course: match[2].trim() };
  return { name: summary.trim(), course: "" };
}

// --- Sync ---

// Fetches the saved feed and returns upcoming assignment events
// (due today or later). Events without a UID are skipped so repeated
// syncs can't duplicate them.
export async function fetchCanvasAssignments() {
  const feedUrl = getFeedUrl();
  if (!feedUrl) throw new Error("No feed URL saved.");

  const events = parseICS(await fetchICS(feedUrl));
  const todayStr = getTodayStr();

  return events.filter((e) => {
    if (!e.UID) return false;
    const isAssignment =
      e.UID.includes("assignment") ||
      (e.CATEGORIES && e.CATEGORIES.toLowerCase().includes("assignment"));
    const dueDate = icsDateToYMD(e.DTSTART || e.DTEND);
    return isAssignment && dueDate && dueDate >= todayStr;
  });
}

// Merges Canvas events into the task list. New events become tasks; events
// already imported (matched by canvasId) get their name, subject, due date,
// and link refreshed so pushed-back deadlines don't go stale. Completion,
// priority, and notes are the student's own edits and are preserved.
export function mergeCanvasAssignments(events) {
  const tasks = loadTasks();
  const byCanvasId = new Map(tasks.filter((t) => t.canvasId).map((t) => [t.canvasId, t]));
  let added = 0;
  let updated = 0;

  for (const e of events) {
    const dueDate = icsDateToYMD(e.DTSTART || e.DTEND);
    const { name, course } = parseSummary(e.SUMMARY || "Untitled Assignment");
    const subject = course || "Canvas";
    const canvasUrl = canvasDirectUrl(e.URL);
    const existing = byCanvasId.get(e.UID);

    if (existing) {
      if (
        existing.name !== name ||
        existing.subject !== subject ||
        existing.dueDate !== dueDate ||
        existing.canvasUrl !== canvasUrl
      ) {
        Object.assign(existing, { name, subject, dueDate, canvasUrl });
        updated += 1;
      }
    } else {
      tasks.push({
        id: crypto.randomUUID(),
        canvasId: e.UID,
        canvasUrl,
        name,
        subject,
        dueDate,
        priority: "Medium",
        notes: "",
        completed: false,
        createdAt: new Date().toISOString(),
        source: "canvas",
      });
      added += 1;
    }
  }

  const saved = saveTasks(tasks);
  return { added, updated, saved };
}

// Full sync: fetch, merge, and report what happened.
export async function syncCanvasTasks() {
  const assignments = await fetchCanvasAssignments();
  const { added, updated, saved } = mergeCanvasAssignments(assignments);
  return { assignments, added, updated, saved };
}
