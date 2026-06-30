const params = new URLSearchParams(window.location.search);
const taskId = params.get("id");

const taskIdMessage = document.querySelector("#task-id-message");
const taskDetailsCard = document.querySelector("#task-details-card");

if (taskId) {
  taskIdMessage.textContent = `Showing details for task ID: ${taskId}`;

  taskDetailsCard.innerHTML = `
    <h3>Selected Task</h3>
    <p>This page received task ID ${taskId} from the URL.</p>
    <p>Later, this ID can be used to find the matching task from localStorage.</p>
  `;
} else {
  taskIdMessage.textContent = "No task ID was found in the URL.";
}