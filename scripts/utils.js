// Shared utilities used across all pages.

export const STORAGE_KEY = "studybuddy_tasks";

// --- Storage ---

export function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// --- Task factory ---

export function createTask(formData) {
  return {
    id: crypto.randomUUID(),
    name: formData["assignment-name"],
    subject: formData["subject"],
    dueDate: formData["due-date"],
    priority: formData["priority"],
    notes: formData["notes"] || "",
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

// --- Validation ---

export function validateForm(formData) {
  const errors = [];

  if (formData["assignment-name"].length > 100) {
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
