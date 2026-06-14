// planner.js

const plannerForm = document.querySelector("#planner-form");
const taskInput = document.querySelector("#planner-task-name");
const dayInput = document.querySelector("#planner-day");
const subjectInput = document.querySelector("#planner-subject");
const priorityInput = document.querySelector("#planner-priority");

plannerForm?.addEventListener("submit", function (event) {
  event.preventDefault();

  const taskName = taskInput.value;
  const day = dayInput.value;
  const subject = subjectInput.value;
  const priority = priorityInput.value;

  if (taskName === "" || day === "" || subject === "" || priority === "") {
    alert("Please fill out all required fields.");
    return;
  }

  const task = document.createElement("div");
  task.classList.add("planner-task");

  task.innerHTML = `
    <h4>${taskName}</h4>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Priority:</strong> ${priority}</p>
    <button type="button" class="complete-btn">Complete</button>
  `;

  const selectedDay = document.querySelector(`#${day}-tasks`);

  if (selectedDay) {
    selectedDay.innerHTML = "";
    selectedDay.appendChild(task);
  }

  plannerForm.reset();
});

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("complete-btn")) {
    event.target.parentElement.classList.toggle("completed");
  }
});