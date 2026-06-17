// Proxies Canvas ICS feeds server-side to bypass CORS. Run locally with `netlify dev`.
const CORS_PROXY = "/.netlify/functions/ics?url=";

const STORAGE_KEY_TASKS    = "studybuddy_tasks";
const STORAGE_KEY_FEED_URL = "canvas_feed_url";
const STORAGE_KEY_PREFS    = "studybuddy_prefs";

// --- Feed URL helpers ---

function getFeedUrl() {
  return localStorage.getItem(STORAGE_KEY_FEED_URL) || null;
}

function setFeedUrl(url) {
  localStorage.setItem(STORAGE_KEY_FEED_URL, url);
}

function clearFeedUrl() {
  localStorage.removeItem(STORAGE_KEY_FEED_URL);
}

// --- ICS fetch ---

async function fetchICS(feedUrl) {
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

function parseICS(text) {
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
function icsDateToYMD(value) {
  if (!value) return null;
  // Strip timezone prefix if present (e.g. TZID=...: was already stripped above)
  const clean = value.replace(/^.*:/, "");
  const digits = clean.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// Converts a Canvas calendar URL to a direct assignment URL.
// Canvas ICS URL field: /calendar?event_id=assignment_<assignmentId>_<courseId>
// Direct assignment URL: /courses/<courseId>/assignments/<assignmentId>
function canvasDirectUrl(url) {
  if (!url) return "";
  try {
    const parsed     = new URL(url);
    const courseId   = (new URLSearchParams(parsed.search).get("include_contexts") || "").replace("course_", "");
    const assignId   = parsed.hash.replace("#assignment_", "");
    if (courseId && assignId && /^\d+$/.test(courseId) && /^\d+$/.test(assignId))
      return `https://${parsed.hostname}/courses/${courseId}/assignments/${assignId}`;
  } catch {}
  return url;
}

// Canvas puts "[Course Code]" at the end of assignment summaries.
// e.g. "Chapter 5 Quiz [WDD 231]" → { name: "Chapter 5 Quiz", course: "WDD 231" }
function parseSummary(summary) {
  const match = summary.match(/^(.+?)\s*\[(.+?)\]\s*$/);
  if (match) return { name: match[1].trim(), course: match[2].trim() };
  return { name: summary.trim(), course: "" };
}

// --- Sync ---

async function syncAssignments() {
  const syncBtn      = document.querySelector("#canvas-sync-btn");
  const coursesNote  = document.querySelector("#canvas-courses-note");
  const courseList   = document.querySelector("#canvas-course-list");
  const lastSynced   = document.querySelector("#canvas-last-synced");

  syncBtn.disabled    = true;
  syncBtn.textContent = "Syncing…";
  coursesNote.hidden  = false;
  coursesNote.textContent = "Fetching your Canvas calendar…";

  try {
    const feedUrl = getFeedUrl();
    if (!feedUrl) throw new Error("No feed URL saved.");

    const icsText = await fetchICS(feedUrl);
    const events  = parseICS(icsText);

    // Keep only assignment events that have a due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const assignments = events.filter((e) => {
      const isAssignment =
        (e.UID    && e.UID.includes("assignment")) ||
        (e.CATEGORIES && e.CATEGORIES.toLowerCase().includes("assignment"));
      const dueDate = icsDateToYMD(e.DTSTART || e.DTEND);
      return isAssignment && dueDate && dueDate >= todayStr;
    });

    mergeCanvasAssignments(assignments);
    renderAssignmentPreview(assignments);

    const count = assignments.length;
    syncBtn.textContent = `Synced ${count} assignment${count !== 1 ? "s" : ""}`;
    lastSynced.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
    lastSynced.hidden = false;
    coursesNote.hidden = true;

  } catch (err) {
    coursesNote.textContent = `Sync failed: ${err.message}`;
    syncBtn.textContent = "Sync failed — try again";
  } finally {
    syncBtn.disabled = false;
    setTimeout(() => { syncBtn.textContent = "Sync Assignments Now"; }, 3000);
  }
}

function mergeCanvasAssignments(events) {
  const existing  = JSON.parse(localStorage.getItem(STORAGE_KEY_TASKS) || "[]");
  const canvasIds = new Set(existing.filter((t) => t.canvasId).map((t) => t.canvasId));

  const newTasks = events
    .filter((e) => !canvasIds.has(e.UID))
    .map((e) => {
      const dueDate = icsDateToYMD(e.DTSTART || e.DTEND);
      const { name, course } = parseSummary(e.SUMMARY || "Untitled Assignment");
      return {
        id:        crypto.randomUUID(),
        canvasId:  e.UID,
        canvasUrl: canvasDirectUrl(e.URL),
        name,
        subject:   course || "Canvas",
        dueDate,
        priority:  "Medium",
        notes:     "",
        completed: false,
        createdAt: new Date().toISOString(),
        source:    "canvas",
      };
    });

  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify([...existing, ...newTasks]));
}

function renderAssignmentPreview(events) {
  const list = document.querySelector("#canvas-course-list");

  if (!events.length) {
    list.innerHTML = "";
    return;
  }

  // Show up to 5 upcoming assignments as a preview
  list.innerHTML = events
    .slice(0, 5)
    .map((e) => {
      const { name, course } = parseSummary(e.SUMMARY || "Untitled");
      const due = icsDateToYMD(e.DTSTART || e.DTEND);
      return `<li class="canvas-course-item">
        <span class="canvas-course-name">${name}</span>
        <span class="canvas-course-code">${course ? `${course} · ` : ""}${due || ""}</span>
      </li>`;
    })
    .join("");
}

// --- UI state ---

function setBadge(status) {
  const badge  = document.querySelector("#canvas-badge");
  const labels = { connected: "Connected", disconnected: "Not connected", connecting: "Connecting…" };
  badge.textContent  = labels[status] || status;
  badge.dataset.status = status;
}

function showConnectedState() {
  const feedUrl = getFeedUrl();
  // Show a truncated version of the URL so the token isn't fully exposed on screen
  const display = feedUrl
    ? feedUrl.replace(/^https?:\/\//, "").slice(0, 60) + (feedUrl.length > 70 ? "…" : "")
    : "—";

  document.querySelector("#canvas-feed-display").textContent = display;
  document.querySelector("#canvas-disconnected").hidden = true;
  document.querySelector("#canvas-connected").hidden    = false;
  document.querySelector("#canvas-error").hidden        = true;
  setBadge("connected");
}

function showDisconnectedState() {
  document.querySelector("#canvas-disconnected").hidden = false;
  document.querySelector("#canvas-connected").hidden    = true;
  document.querySelector("#canvas-error").hidden        = true;
  document.querySelector("#canvas-feed-url").value      = "";
  setBadge("disconnected");
}

function showCanvasError(message) {
  document.querySelector("#canvas-error-msg").textContent = message;
  document.querySelector("#canvas-disconnected").hidden   = false;
  document.querySelector("#canvas-connected").hidden      = true;
  document.querySelector("#canvas-error").hidden          = false;
  setBadge("disconnected");
}

// --- Feed form submit ---

async function handleFeedFormSubmit(event) {
  event.preventDefault();
  const input   = document.querySelector("#canvas-feed-url");
  const feedUrl = input.value.trim();
  const submitBtn = event.target.querySelector("button[type=submit]");

  // Basic sanity check — must look like a Canvas feed URL
  if (!feedUrl.includes("/feeds/calendars/")) {
    showCanvasError(
      "That doesn't look like a Canvas calendar feed URL. " +
      "Go to Canvas → Calendar → Calendar Feed to copy the correct link."
    );
    return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = "Connecting…";
  setBadge("connecting");

  try {
    // Do a test fetch to validate the URL before saving
    await fetchICS(feedUrl);
    setFeedUrl(feedUrl);
    showConnectedState();
    // Auto-sync on first connect
    await syncAssignments();
  } catch (err) {
    showCanvasError(`Could not read the feed: ${err.message} — check that the URL is correct.`);
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Connect";
  }
}

// --- Preferences ---

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PREFS)) || {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
}

function initPrefs() {
  const prefs        = loadPrefs();
  const showCompleted = document.querySelector("#pref-show-completed");
  const autoSync      = document.querySelector("#pref-auto-sync");

  showCompleted.checked = prefs.showCompleted ?? false;
  autoSync.checked      = prefs.autoSync      ?? false;

  showCompleted.addEventListener("change", () => {
    savePrefs({ ...loadPrefs(), showCompleted: showCompleted.checked });
  });
  autoSync.addEventListener("change", () => {
    savePrefs({ ...loadPrefs(), autoSync: autoSync.checked });
  });
}

// --- Clear data ---

function initClearData() {
  const clearBtn     = document.querySelector("#clear-data-btn");
  const confirmModal = document.querySelector("#confirm-clear-modal");
  const cancelBtn    = document.querySelector("#cancel-clear-btn");
  const confirmBtn   = document.querySelector("#confirm-clear-btn");
  const closeBtn     = document.querySelector("#close-confirm-modal");

  clearBtn.addEventListener("click",  () => confirmModal.showModal());
  cancelBtn.addEventListener("click", () => confirmModal.close());
  closeBtn.addEventListener("click",  () => confirmModal.close());
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) confirmModal.close();
  });

  confirmBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY_TASKS);
    confirmModal.close();
    confirmBtn.textContent = "Cleared";
    setTimeout(() => { confirmBtn.textContent = "Yes, clear everything"; }, 2000);
  });
}

// --- Footer ---

function setFooterDates() {
  const yearEl     = document.querySelector("#current-year");
  const modifiedEl = document.querySelector("#last-modified");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (modifiedEl) {
    modifiedEl.textContent = `Last updated: ${new Date(document.lastModified).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })}`;
  }
}

// --- Mobile nav ---

function handleMenuToggle() {
  const nav    = document.querySelector("#nav-menu");
  const btn    = document.querySelector("#menu-button");
  const isOpen = nav.classList.toggle("nav-open");
  btn.setAttribute("aria-expanded", isOpen);
}

// --- Init ---

function init() {
  document.querySelector("#menu-button").addEventListener("click", handleMenuToggle);
  document.querySelector("#canvas-feed-form").addEventListener("submit", handleFeedFormSubmit);
  document.querySelector("#canvas-disconnect-btn").addEventListener("click", () => {
    clearFeedUrl();
    showDisconnectedState();
  });
  document.querySelector("#canvas-retry-btn").addEventListener("click", showDisconnectedState);
  document.querySelector("#canvas-sync-btn").addEventListener("click", syncAssignments);

  // Restore connection state
  if (getFeedUrl()) {
    showConnectedState();
  } else {
    showDisconnectedState();
  }

  initPrefs();
  initClearData();
  setFooterDates();
}

document.addEventListener("DOMContentLoaded", init);
