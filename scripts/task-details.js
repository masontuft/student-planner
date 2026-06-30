// task-details.js

const params = new URLSearchParams(window.location.search);
const taskId = params.get("id");

const taskIdMessage = document.querySelector("#task-id-message");
const taskDetailsCard = document.querySelector("#task-details-card");

// Use the same localStorage key your main planner uses
const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];

if (taskId) {
  const selectedTask = savedTasks.find((task) => task.id === taskId);

  if (selectedTask) {
    taskIdMessage.textContent = "Task details loaded successfully.";

    taskDetailsCard.innerHTML = `
      <h3>${selectedTask.name}</h3>
      <p><strong>Subject:</strong> ${selectedTask.subject}</p>
      <p><strong>Due Date:</strong> ${selectedTask.dueDate}</p>
      <p><strong>Priority:</strong> ${selectedTask.priority}</p>
      <p><strong>Notes:</strong> ${selectedTask.notes || "No notes added."}</p>
      <p><strong>Status:</strong> ${selectedTask.completed ? "Completed" : "Not completed"}</p>
    `;
  } else {
    taskIdMessage.textContent = "No task was found with that ID.";

    taskDetailsCard.innerHTML = `
      <p>The task may have been deleted or the URL may be incorrect.</p>
    `;
  }
} else {
  taskIdMessage.textContent = "No task ID was found in the URL.";

  taskDetailsCard.innerHTML = `
    <p>Please go back to the planner and choose a task to view.</p>
  `;
}