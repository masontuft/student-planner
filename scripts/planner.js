// planner.js — Weekly calendar view, shares localStorage with main.js
import { STORAGE_KEY, loadTasks, saveTasks, createTask, validateForm, handleMenuToggle, setFooterDates } from "./utils.js";

let currentWeekOffset = 0;

// --- Date helpers ---

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayStr() {
  return toDateStr(new Date());
}

function getWeekDates(offset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek + offset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function formatDate(dueDateStr) {
  return new Date(dueDateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// --- Calendar rendering ---

export function renderCalendar() {
  const tasks = loadTasks();
  const dates = getWeekDates(currentWeekOffset);
  const today = getTodayStr();

  // Week label
  const startOpts = { month: "short", day: "numeric" };
  const endOpts = { month: "short", day: "numeric", year: "numeric" };
  const label = `${dates[0].toLocaleDateString("en-US", startOpts)} – ${dates[6].toLocaleDateString("en-US", endOpts)}`;
  document.querySelector("#week-label").textContent = label;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const grid = document.querySelector("#calendar-grid");
  grid.innerHTML = dates.map((date) => {
    const dateStr = toDateStr(date);
    const isToday = dateStr === today;
    const isPast = dateStr < today;
    const dayTasks = tasks.filter((t) => t.dueDate === dateStr);

    const taskHTML = dayTasks.length > 0
      ? dayTasks.map((t) => `
          <div class="day-task-pill ${t.completed ? "day-task-completed" : ""}"
               data-id="${t.id}"
               data-priority="${t.priority}"
               role="button"
               tabindex="0"
               aria-label="${t.name}, ${t.subject}, ${t.priority} priority${t.completed ? ", completed" : ""}">
            <span class="pill-dot" aria-hidden="true"></span>
            <span class="pill-name">${t.name}</span>
          </div>
        `).join("")
      : `<p class="day-empty">No tasks</p>`;

    return `
      <div class="calendar-day ${isToday ? "is-today" : ""} ${isPast && !isToday ? "is-past" : ""}" data-date="${dateStr}">
        <div class="calendar-day-header">
          <span class="day-name">${dayNames[date.getDay()]}</span>
          <span class="day-num">${date.getDate()}</span>
        </div>
        <div class="day-tasks">${taskHTML}</div>
      </div>
    `;
  }).join("");

  // Pill click → modal
  grid.querySelectorAll(".day-task-pill").forEach((pill) => {
    const open = () => openModal(pill.dataset.id);
    pill.addEventListener("click", open);
    pill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
}

// --- Modal ---

export function openModal(taskId) {
  const task = loadTasks().find((t) => t.id === taskId);
  if (!task) return;

  const canvasLink = task.canvasUrl
    ? `<a href="${task.canvasUrl}" target="_blank" rel="noopener noreferrer">Open in Canvas</a>`
    : null;

  document.querySelector("#modal-body").innerHTML = `
    <p>
      <strong>Assignment:</strong> ${task.name}
      <span class="modal-priority-badge badge-${task.priority}">${task.priority}</span>
    </p>
    <p><strong>Subject:</strong> ${task.subject}</p>
    <p><strong>Due:</strong> ${formatDate(task.dueDate)}</p>
    <p><strong>Status:</strong> ${task.completed ? "&#10003; Completed" : "Incomplete"}</p>
    ${task.notes ? `<p><strong>Notes:</strong> ${task.notes}</p>` : ""}
    ${canvasLink ? `<p><strong>Canvas:</strong> ${canvasLink}</p>` : ""}
    <div class="modal-actions">
      <button class="button-outline" id="modal-toggle-complete">
        ${task.completed ? "Mark Incomplete" : "Mark Complete"}
      </button>
      <button class="button-danger" id="modal-delete">Delete Task</button>
    </div>
  `;

  document.querySelector("#modal-toggle-complete").addEventListener("click", () => {
    const tasks = loadTasks().map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    saveTasks(tasks);
    closeModal();
    renderCalendar();
  });

  document.querySelector("#modal-delete").addEventListener("click", () => {
    saveTasks(loadTasks().filter((t) => t.id !== taskId));
    closeModal();
    renderCalendar();
  });

  document.querySelector("#task-modal").showModal();
}

function closeModal() {
  document.querySelector("#task-modal").close();
}

// --- Form ---

function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = Object.fromEntries(new FormData(form));
  const errorEl = document.querySelector("#planner-form-error");

  const { valid, errors } = validateForm(formData);
  if (!valid) {
    errorEl.textContent = errors.join(" ");
    return;
  }

  errorEl.textContent = "";
  const tasks = loadTasks();
  const newTask = createTask(formData);
  tasks.push(newTask);
  saveTasks(tasks);

  // Jump to the week containing the new task's due date
  const dueDate = new Date(formData["due-date"] + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - todayDay);
  const dueSunday = new Date(dueDate);
  dueSunday.setDate(dueDate.getDate() - dueDate.getDay());
  const diffWeeks = Math.round((dueSunday - thisSunday) / (7 * 24 * 60 * 60 * 1000));
  currentWeekOffset = diffWeeks;

  renderCalendar();
  form.reset();
  setDefaultDate();

  // Scroll calendar into view
  document.querySelector("#calendar-grid").scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Default date ---

function setDefaultDate() {
  const dateInput = document.querySelector("#planner-due-date");
  if (dateInput) dateInput.value = getTodayStr();
}

// --- Init ---

function init() {
  renderCalendar();
  setDefaultDate();
  setFooterDates();

  document.querySelector("#planner-form").addEventListener("submit", handleFormSubmit);
  document.querySelector("#prev-week").addEventListener("click", () => {
    currentWeekOffset -= 1;
    renderCalendar();
  });
  document.querySelector("#next-week").addEventListener("click", () => {
    currentWeekOffset += 1;
    renderCalendar();
  });
  document.querySelector("#today-btn").addEventListener("click", () => {
    currentWeekOffset = 0;
    renderCalendar();
  });
  document.querySelector("#menu-button").addEventListener("click", handleMenuToggle);
  document.querySelector("#close-modal").addEventListener("click", closeModal);
  document.querySelector("#task-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
