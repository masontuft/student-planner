// Shared utilities used across all pages.

export const STORAGE_KEY = "studybuddy_tasks";
export const PREFS_KEY = "studybuddy_prefs";

// --- Storage ---

export function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// Returns false when the write fails (private browsing, quota exceeded).
export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}

// --- Preferences ---

export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

// --- Task factory ---

export function createTask(formData) {
  return {
    id: crypto.randomUUID(),
    name: formData["assignment-name"].trim(),
    subject: formData["subject"],
    dueDate: formData["due-date"],
    priority: formData["priority"],
    notes: formData["notes"] || "",
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

// --- Escaping ---

// Escapes a value for safe interpolation into HTML text and attribute contexts.
export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// --- Dates ---

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayStr() {
  return toDateStr(new Date());
}

export function formatDate(dueDateStr, options = { year: "numeric", month: "short", day: "numeric" }) {
  return new Date(dueDateStr + "T00:00:00").toLocaleDateString("en-US", options);
}

// --- Validation ---

export function validateForm(formData) {
  const errors = [];

  const name = formData["assignment-name"].trim();
  if (!name) {
    errors.push("Assignment name is required.");
  } else if (name.length > 100) {
    errors.push("Assignment name must be 100 characters or fewer.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(formData["due-date"] + "T00:00:00");
  if (isNaN(due.getTime())) {
    errors.push("Please enter a valid due date.");
  } else if (due < today) {
    errors.push("Due date cannot be in the past.");
  }

  return { valid: errors.length === 0, errors };
}

// --- Navigation ---

export function handleMenuToggle() {
  const menuButton = document.querySelector("#menu-button");
  const navMenu = document.querySelector("#nav-menu");

  if (!menuButton || !navMenu) return;

  const isOpen = navMenu.classList.toggle("open");

  menuButton.setAttribute("aria-expanded", isOpen);

  if (isOpen) {
    menuButton.setAttribute("aria-label", "Close navigation menu");
  } else {
    menuButton.setAttribute("aria-label", "Open navigation menu");
  }
}

// --- Footer ---

export function setFooterDates() {
  const yearEl = document.querySelector("#current-year");
  const modifiedEl = document.querySelector("#last-modified");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (modifiedEl) {
    modifiedEl.textContent = `Last updated: ${new Date(document.lastModified).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  }
}
