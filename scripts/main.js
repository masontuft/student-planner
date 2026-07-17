import {
  loadTasks,
  saveTasks,
  createTask,
  validateForm,
  handleMenuToggle,
  setFooterDates,
  escapeHTML,
  formatDate,
  toDateStr,
  getTodayStr,
  loadPrefs,
} from "./utils.js";
import { getFeedUrl, syncCanvasTasks } from "./canvas-sync.js";

let tipsData = [];
let lastTipIndex = -1;
let incompleteShown = 9;
let completedShown = 3;
let taskIdToDelete = null;

// --- Toast notifications ---

function showToast(message, type = "success") {
  const toast = document.querySelector("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show";

  if (type === "error") {
    toast.classList.add("error");
  }

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

// --- Form handling ---

function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = Object.fromEntries(new FormData(form));
  const errorEl = document.querySelector("#form-error");

  const { valid, errors } = validateForm(formData);
  if (!valid) {
    errorEl.textContent = errors.join(" ");
    showToast("Please fix the form errors before saving.", "error");
    return;
  }

  errorEl.textContent = "";
  const tasks = loadTasks();
  tasks.push(createTask(formData));
  if (!saveTasks(tasks)) {
    showToast("Could not save the task — storage may be full or blocked.", "error");
    return;
  }
  renderTaskList();
  form.reset();
  showToast("Task saved successfully!");
}

// --- Rendering ---

function createTaskCardHTML(task) {
  const checked = task.completed ? "checked" : "";
  return `
    <article class="task-card" data-id="${escapeHTML(task.id)}" data-priority="${escapeHTML(task.priority)}">
      <div class="task-card-header">
        <span class="task-priority-badge">${escapeHTML(task.priority)}</span>
        <span class="task-subject">${escapeHTML(task.subject)}</span>
      </div>
      <h3 class="task-name">${escapeHTML(task.name)}</h3>
      <p class="task-due">Due: ${formatDate(task.dueDate)}</p>
      <div class="task-card-footer">
        <label class="task-complete-label">
          <input type="checkbox" class="task-complete-checkbox" ${checked} aria-label="Mark as complete">
          Complete
        </label>
        <a href="task-details.html?id=${encodeURIComponent(task.id)}" class="task-details-link">View Details</a>
        <button class="task-delete-btn" aria-label="Delete task">Delete</button>
      </div>
    </article>
  `;
}

function updateSummaryCards(tasks) {
  const openEl      = document.querySelector("#summary-open");
  const dueWeekEl   = document.querySelector("#summary-due-week");
  const completedEl = document.querySelector("#summary-completed");
  if (!openEl || !dueWeekEl || !completedEl) return;

  const incomplete = tasks.filter((t) => !t.completed);
  const todayStr = getTodayStr();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = toDateStr(weekEnd);

  openEl.textContent      = incomplete.length;
  dueWeekEl.textContent   = incomplete.filter((t) => t.dueDate >= todayStr && t.dueDate <= weekEndStr).length;
  completedEl.textContent = tasks.length - incomplete.length;
}

export function renderTaskList() {
  const tasks      = loadTasks();
  const incomplete = tasks.filter((t) => !t.completed);
  const completed  = tasks.filter((t) => t.completed);

  const note             = document.querySelector("#task-section-note");
  const incompleteList   = document.querySelector("#incomplete-list");
  const completedSection = document.querySelector("#completed-section");
  const completedList    = document.querySelector("#completed-list");
  const showMoreInc      = document.querySelector("#show-more-incomplete");
  const showMoreComp     = document.querySelector("#show-more-completed");

  updateSummaryCards(tasks);

  note.hidden = tasks.length > 0;

  incompleteList.innerHTML = incomplete.slice(0, incompleteShown).map(createTaskCardHTML).join("");
  showMoreInc.hidden = incomplete.length <= incompleteShown;

  const showCompleted = loadPrefs().showCompleted ?? true;

  if (completed.length > 0 && showCompleted) {
    completedSection.hidden = false;
    completedList.innerHTML = completed.slice(0, completedShown).map(createTaskCardHTML).join("");
    showMoreComp.hidden = completed.length <= completedShown;
  } else {
    completedSection.hidden = true;
  }
}

// --- Task mutations ---

function handleToggleComplete(event) {
  if (!event.target.classList.contains("task-complete-checkbox")) return;
  const card = event.target.closest("[data-id]");
  const id = card.dataset.id;
  const tasks = loadTasks().map((t) =>
    t.id === id ? { ...t, completed: event.target.checked } : t
  );
  if (!saveTasks(tasks)) {
    showToast("Could not update the task — storage may be full or blocked.", "error");
  }
  renderTaskList();
}

// --- Delete task ---

function handleDeleteTask(event) {
  const card = event.target.closest("[data-id]");
  taskIdToDelete = card.dataset.id;

  const deleteModal = document.querySelector("#delete-modal");
  if (deleteModal) deleteModal.showModal();
}

function confirmDeleteTask() {
  if (!taskIdToDelete) return;

  if (!saveTasks(loadTasks().filter((task) => task.id !== taskIdToDelete))) {
    showToast("Could not delete the task — storage may be full or blocked.", "error");
  } else {
    showToast("Assignment deleted.");
  }
  renderTaskList();

  taskIdToDelete = null;

  const deleteModal = document.querySelector("#delete-modal");
  if (deleteModal) deleteModal.close();
}

function cancelDeleteTask() {
  taskIdToDelete = null;

  const deleteModal = document.querySelector("#delete-modal");
  if (deleteModal) deleteModal.close();
}


// --- Modal ---

function openModal(taskId) {
  const task = loadTasks().find((t) => t.id === taskId);
  if (!task) return;

  const canvasLink = task.canvasUrl
    ? `<a href="${escapeHTML(task.canvasUrl)}" target="_blank" rel="noopener noreferrer">Open in Canvas</a>`
    : null;

  document.querySelector("#modal-text").innerHTML = `
    <strong>Assignment:</strong> ${escapeHTML(task.name)}<br>
    <strong>Subject:</strong> ${escapeHTML(task.subject)}<br>
    <strong>Due:</strong> ${formatDate(task.dueDate)}<br>
    <strong>Priority:</strong> ${escapeHTML(task.priority)}<br>
    <strong>Status:</strong> ${task.completed ? "Complete" : "Incomplete"}<br>
    <strong>Notes:</strong> ${escapeHTML(task.notes) || "None"}
    ${canvasLink ? `<br><strong>Canvas:</strong> ${canvasLink}` : ""}
  `;
  document.querySelector("#task-modal").showModal();
}

function closeModal() {
  document.querySelector("#task-modal").close();
}

function handleTaskListClick(event) {
  if (event.target.closest(".task-delete-btn")) {
    handleDeleteTask(event);
    return;
  }

  if (event.target.closest(".task-complete-checkbox")) return;

  if (event.target.closest(".task-details-link")) return;

  const card = event.target.closest(".task-card");
  if (card) openModal(card.dataset.id);
}

// --- Study tips ---

async function loadStudyTips() {
  try {
    const res = await fetch("data/studyTips.json");
    return await res.json();
  } catch {
    return [{ id: 0, tip: "Break large assignments into smaller tasks so they feel easier to complete.", category: "focus" }];
  }
}

function displayRandomTip(tips) {
  let index;
  do {
    index = Math.floor(Math.random() * tips.length);
  } while (tips.length > 1 && index === lastTipIndex);
  lastTipIndex = index;
  document.querySelector("#study-tip-card").innerHTML = `<p>${escapeHTML(tips[index].tip)}</p>`;
}

function handleNewTipClick() {
  displayRandomTip(tipsData);
}

// --- Canvas auto-sync ---

async function maybeAutoSyncCanvas() {
  if (!(loadPrefs().autoSync && getFeedUrl())) return;
  try {
    const { added, updated } = await syncCanvasTasks();
    if ((added || updated) && document.querySelector("#assignment-section")) {
      renderTaskList();
      showToast(`Canvas sync: ${added} new, ${updated} updated.`);
    }
  } catch {
    // Sync errors are surfaced on the Settings page; keep page load quiet.
  }
}

// --- Init ---

async function init() {
  const assignmentForm = document.querySelector("#assignment-form");
  const assignmentSection = document.querySelector("#assignment-section");
  const newTipButton = document.querySelector("#new-tip-button");
  const menuButton = document.querySelector("#menu-button");
  const closeModalBtn = document.querySelector("#close-modal");
  const taskModal = document.querySelector("#task-modal");
  const showMoreIncomplete = document.querySelector("#show-more-incomplete");
  const showMoreCompleted = document.querySelector("#show-more-completed");
  const confirmDeleteBtn = document.querySelector("#confirm-delete");
  const cancelDeleteBtn = document.querySelector("#cancel-delete");
  const deleteModal = document.querySelector("#delete-modal");
  const dueDateInput = document.querySelector("#due-date");

  if (dueDateInput) dueDateInput.min = getTodayStr();

  if (assignmentForm) assignmentForm.addEventListener("submit", handleFormSubmit);

  if (assignmentSection) {
    assignmentSection.addEventListener("click", handleTaskListClick);
    assignmentSection.addEventListener("change", handleToggleComplete);
  }

  if (showMoreIncomplete) {
    showMoreIncomplete.addEventListener("click", () => {
      incompleteShown += 9;
      renderTaskList();
    });
  }

  if (showMoreCompleted) {
    showMoreCompleted.addEventListener("click", () => {
      completedShown += 3;
      renderTaskList();
    });
  }

  if (newTipButton) newTipButton.addEventListener("click", handleNewTipClick);
  if (menuButton) menuButton.addEventListener("click", handleMenuToggle);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

  if (taskModal) {
    taskModal.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  }

  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", confirmDeleteTask);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", cancelDeleteTask);

  if (deleteModal) {
    deleteModal.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) cancelDeleteTask();
    });
  }

  if (assignmentSection) renderTaskList();

  setFooterDates();
  maybeAutoSyncCanvas();

  if (newTipButton) {
    tipsData = await loadStudyTips();
    displayRandomTip(tipsData);
  }
}

document.addEventListener("DOMContentLoaded", init);
