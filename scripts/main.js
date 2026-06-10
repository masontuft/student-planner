const STORAGE_KEY = "studybuddy_tasks";
let tipsData = [];
let lastTipIndex = -1;
let incompleteShown = 9;
let completedShown = 3;

// --- Storage ---

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// --- Task factory ---

function createTask(formData) {
  return {
    id: crypto.randomUUID(),
    name: formData["assignment-name"],
    subject: formData["subject"],
    dueDate: formData["due-date"],
    priority: formData["priority"],
    notes: formData["notes"],
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

// --- Validation ---

function validateForm(formData) {
  const errors = [];

  if (formData["assignment-name"].length > 100) {
    errors.push("Assignment name must be 100 characters or fewer.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(formData["due-date"] + "T00:00:00");
  if (due < today) {
    errors.push("Due date cannot be in the past.");
  }

  return { valid: errors.length === 0, errors };
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
    return;
  }

  errorEl.textContent = "";
  const tasks = loadTasks();
  tasks.push(createTask(formData));
  saveTasks(tasks);
  renderTaskList();
  form.reset();
}

// --- Rendering ---

function formatDate(dueDateStr) {
  return new Date(dueDateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function createTaskCardHTML(task) {
  const checked = task.completed ? "checked" : "";
  return `
    <article class="task-card" data-id="${task.id}" data-priority="${task.priority}">
      <div class="task-card-header">
        <span class="task-priority-badge">${task.priority}</span>
        <span class="task-subject">${task.subject}</span>
      </div>
      <h3 class="task-name">${task.name}</h3>
      <p class="task-due">Due: ${formatDate(task.dueDate)}</p>
      <div class="task-card-footer">
        <label class="task-complete-label">
          <input type="checkbox" class="task-complete-checkbox" ${checked} aria-label="Mark as complete">
          Complete
        </label>
        <button class="task-delete-btn" aria-label="Delete task">Delete</button>
      </div>
    </article>
  `;
}

function renderTaskList() {
  const tasks      = loadTasks();
  const incomplete = tasks.filter((t) => !t.completed);
  const completed  = tasks.filter((t) => t.completed);

  const note             = document.querySelector("#task-section-note");
  const incompleteList   = document.querySelector("#incomplete-list");
  const completedSection = document.querySelector("#completed-section");
  const completedList    = document.querySelector("#completed-list");
  const showMoreInc      = document.querySelector("#show-more-incomplete");
  const showMoreComp     = document.querySelector("#show-more-completed");

  note.hidden = tasks.length > 0;

  incompleteList.innerHTML = incomplete.slice(0, incompleteShown).map(createTaskCardHTML).join("");
  showMoreInc.hidden = incomplete.length <= incompleteShown;

  if (completed.length > 0) {
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
  saveTasks(tasks);
  renderTaskList();
}

function handleDeleteTask(event) {
  const id = event.target.closest("[data-id]").dataset.id;
  saveTasks(loadTasks().filter((t) => t.id !== id));
  renderTaskList();
}

// --- Modal ---

function openModal(taskId) {
  const task = loadTasks().find((t) => t.id === taskId);
  if (!task) return;

  const canvasLink = task.canvasUrl
    ? `<a href="${task.canvasUrl}" target="_blank" rel="noopener noreferrer">Open in Canvas</a>`
    : null;

  document.querySelector("#modal-text").innerHTML = `
    <strong>Assignment:</strong> ${task.name}<br>
    <strong>Subject:</strong> ${task.subject}<br>
    <strong>Due:</strong> ${formatDate(task.dueDate)}<br>
    <strong>Priority:</strong> ${task.priority}<br>
    <strong>Status:</strong> ${task.completed ? "Complete" : "Incomplete"}<br>
    <strong>Notes:</strong> ${task.notes || "None"}
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
  document.querySelector("#study-tip-card").innerHTML = `<p>${tips[index].tip}</p>`;
}

function handleNewTipClick() {
  displayRandomTip(tipsData);
}

// --- Navigation ---

function handleMenuToggle() {
  const nav = document.querySelector("#nav-menu");
  const btn = document.querySelector("#menu-button");
  const isOpen = nav.classList.toggle("nav-open");
  btn.setAttribute("aria-expanded", isOpen);
}

// --- Footer ---

function setFooterDates() {
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

// --- Init ---

async function init() {
  document.querySelector("#assignment-form").addEventListener("submit", handleFormSubmit);

  const assignmentSection = document.querySelector("#assignment-section");
  assignmentSection.addEventListener("click", handleTaskListClick);
  assignmentSection.addEventListener("change", handleToggleComplete);

  document.querySelector("#show-more-incomplete").addEventListener("click", () => {
    incompleteShown += 9;
    renderTaskList();
  });
  document.querySelector("#show-more-completed").addEventListener("click", () => {
    completedShown += 3;
    renderTaskList();
  });
  document.querySelector("#new-tip-button").addEventListener("click", handleNewTipClick);
  document.querySelector("#menu-button").addEventListener("click", handleMenuToggle);
  document.querySelector("#close-modal").addEventListener("click", closeModal);
  document.querySelector("#task-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  renderTaskList();
  tipsData = await loadStudyTips();
  displayRandomTip(tipsData);
  setFooterDates();
}

document.addEventListener("DOMContentLoaded", init);
