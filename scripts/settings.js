// Settings page: Canvas connection UI, app preferences, and data clearing.
// Canvas fetch/parse/merge logic lives in canvas-sync.js.
import { STORAGE_KEY, loadPrefs, savePrefs, escapeHTML, handleMenuToggle, setFooterDates } from "./utils.js";
import {
  getFeedUrl,
  setFeedUrl,
  clearFeedUrl,
  fetchICS,
  icsDateToYMD,
  parseSummary,
  syncCanvasTasks,
} from "./canvas-sync.js";

// --- Sync ---

export async function syncAssignments() {
  const syncBtn      = document.querySelector("#canvas-sync-btn");
  const coursesNote  = document.querySelector("#canvas-courses-note");
  const lastSynced   = document.querySelector("#canvas-last-synced");

  syncBtn.disabled    = true;
  syncBtn.textContent = "Syncing…";
  coursesNote.hidden  = false;
  coursesNote.textContent = "Fetching your Canvas calendar…";

  try {
    const { assignments, added, updated, saved } = await syncCanvasTasks();
    if (!saved) throw new Error("Could not save to this device's storage.");

    renderAssignmentPreview(assignments);

    const count = assignments.length;
    syncBtn.textContent = `Synced ${count} assignment${count !== 1 ? "s" : ""}`;

    const parts = [];
    if (added) parts.push(`${added} new`);
    if (updated) parts.push(`${updated} updated`);
    lastSynced.textContent = `Last synced: ${new Date().toLocaleTimeString()}${parts.length ? ` (${parts.join(", ")})` : ""}`;
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
        <span class="canvas-course-name">${escapeHTML(name)}</span>
        <span class="canvas-course-code">${course ? `${escapeHTML(course)} · ` : ""}${escapeHTML(due || "")}</span>
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
    if (!setFeedUrl(feedUrl)) {
      throw new Error("Could not save the feed URL on this device — storage may be full or blocked.");
    }
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

function initPrefs() {
  const prefs         = loadPrefs();
  const showCompleted = document.querySelector("#pref-show-completed");
  const autoSync      = document.querySelector("#pref-auto-sync");

  showCompleted.checked = prefs.showCompleted ?? true;
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
    localStorage.removeItem(STORAGE_KEY);
    confirmModal.close();
    confirmBtn.textContent = "Cleared";
    setTimeout(() => { confirmBtn.textContent = "Yes, clear everything"; }, 2000);
  });
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
    if (loadPrefs().autoSync) syncAssignments();
  } else {
    showDisconnectedState();
  }

  initPrefs();
  initClearData();
  setFooterDates();
}

document.addEventListener("DOMContentLoaded", init);
