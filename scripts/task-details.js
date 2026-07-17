// Task details page: reads ?id= from the URL and renders the matching task.
import { loadTasks, escapeHTML, formatDate, handleMenuToggle, setFooterDates } from "./utils.js";

function renderTaskDetails() {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get("id");

  const message = document.querySelector("#task-id-message");
  const card = document.querySelector("#task-details-card");

  if (!taskId) {
    message.textContent = "No task ID was found in the URL.";
    card.innerHTML = "<p>Please go back to the planner and choose a task to view.</p>";
    return;
  }

  const task = loadTasks().find((t) => t.id === taskId);

  if (!task) {
    message.textContent = "No task was found with that ID.";
    card.innerHTML = "<p>The task may have been deleted or the URL may be incorrect.</p>";
    return;
  }

  message.textContent = "Task details loaded successfully.";

  const canvasLink = task.canvasUrl
    ? `<p><strong>Canvas:</strong> <a href="${escapeHTML(task.canvasUrl)}" target="_blank" rel="noopener noreferrer">Open in Canvas</a></p>`
    : "";

  card.innerHTML = `
    <h2>${escapeHTML(task.name)}</h2>
    <p><strong>Subject:</strong> ${escapeHTML(task.subject)}</p>
    <p><strong>Due Date:</strong> ${formatDate(task.dueDate)}</p>
    <p><strong>Priority:</strong> ${escapeHTML(task.priority)}</p>
    <p><strong>Notes:</strong> ${escapeHTML(task.notes) || "No notes added."}</p>
    <p><strong>Status:</strong> ${task.completed ? "Completed" : "Not completed"}</p>
    ${canvasLink}
  `;
}

function init() {
  renderTaskDetails();

  const menuButton = document.querySelector("#menu-button");
  if (menuButton) menuButton.addEventListener("click", handleMenuToggle);

  setFooterDates();
}

document.addEventListener("DOMContentLoaded", init);
