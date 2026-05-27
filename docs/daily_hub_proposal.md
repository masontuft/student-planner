# Team Project Proposal: Daily Hub

## Project overview

**Project name:** Daily Hub

**Description:** Daily Hub is a responsive student planning web app that combines personal scheduling, school deadlines, and manually managed tasks into one interface. The app is designed around a daily and weekly planning workflow so a student can see upcoming events, assignment deadlines, and priority tasks in one place.

**Target audience:** College students who manage school, work, and personal responsibilities across multiple digital tools such as Google Calendar and learning management systems like Canvas.

## Why this idea was chosen

This idea fits the course requirements well because it naturally supports forms, local persistence, API or JSON data, filters, responsive layouts, URL-based state, and modular JavaScript organization. It is also practical enough to keep using after the course, which makes the project more motivating than a one-time demo app.

## Core features and functionality

- Dashboard with a Today view showing current date, upcoming events, due assignments, and high-priority tasks.
- Weekly planner view for organizing tasks and time blocks.
- Task manager with create, edit, delete, complete, and priority features.
- Source filters for personal tasks, Google Calendar events, and imported school items.
- Optional multi-source academic import model for more than one class source or account.
- Detail page or modal for each task/event with notes, due time, class tag, and status.
- Responsive layout for mobile and desktop use.

## Main user flow

1. Open the dashboard and choose a date or planner view.
2. Add a task manually or connect/import an external source.
3. Review all tasks and events in one combined schedule.
4. Filter by class, source, or urgency.
5. Open an item to view details, mark complete, or edit it.

## Wireframe notes

The assignment asks for at least two wireframes for the main page, one mobile and one wide-screen layout. The following wireframe descriptions can be used to sketch the proposal by hand or recreate in Figma.

### Mobile wireframe

- Header with logo/title, date, and menu button.
- Small summary cards for tasks due today and upcoming events.
- Primary action button: Add Task.
- Vertical agenda list with time, title, source label, and status.
- Bottom filter row with options such as All, School, Personal, and Completed.
- Slide-out menu for settings, connected accounts, and planner views.

### Desktop wireframe

- Top bar with title, date selector, and account/settings menu.
- Left sidebar for navigation: Today, Week, Tasks, Connected Sources, Settings.
- Main center panel for the day or week schedule.
- Right panel for upcoming deadlines and selected item details.
- Floating or top-right button for adding a new task.
- Filter dropdowns for class, source, and priority.

## How project requirements will be met

| Course requirement | Planned implementation |
|---|---|
| Detailed, validated form | Main task form with title, due date, due time, category/class, priority, estimated duration, notes, and validation rules for required fields and date logic. |
| Local storage | Store user preferences, selected view, filter settings, manually created tasks, and cached imported items for persistence between visits. |
| API or JSON data | Use the Google Calendar API for event retrieval in the browser, and use either a Canvas-related import path or a local JSON dataset for assignment/task seed data. |
| Drop-down menu | Dropdowns for source filter, class filter, planner view, and sorting options. |
| CSS animation | Smooth task completion animation, card expand/collapse, loading transitions, and mobile menu animation. |
| Responsive design | Mobile-first layout with stacked sections on phones and multi-column dashboard on wider screens. |
| UX and accessibility | Semantic HTML, labeled forms, keyboard-friendly navigation, readable contrast, and clear task status indicators. |
| URL parameters | Support views such as `?date=2026-05-15`, `?view=week`, or `?task=123` so the app can open a specific date or item directly. |
| Use of modules | Separate modules for task data, rendering, storage, filters, URL state, and external integrations. |

## Data and integration plan

The most realistic external integration is Google Calendar because Google provides a JavaScript quickstart and overview documentation for browser-based Calendar API usage. Canvas-related support should be scoped carefully because Canvas API access depends on permissions and the LMS environment, so the proposal should treat multi-account Canvas import as an enhancement rather than the first milestone.

### Planned data sources

- Primary external source: Google Calendar events.
- Internal data: Manually created tasks stored in local storage.
- School/task seed data: Local JSON file or controlled import format for assignments.
- Stretch goal: Canvas import from one or more accounts if the team can validate API access early.

## Scope and risk control

To reduce risk, the first milestone should focus on a fully working planner with local task creation, filtering, responsive UI, and URL-driven state. After the core app works, the team can add Google Calendar integration and then evaluate whether Canvas import is realistic for the remaining timeline.

## Backup ideas

These simpler alternatives keep the same general productivity theme but reduce integration complexity.

### Backup idea 1: Assignment Tracker

A focused app for tracking homework, due dates, classes, and completion status. This option still covers forms, local storage, JSON data, filters, URL parameters, and responsive design without depending on third-party authentication.

### Backup idea 2: Weekly Meal and Grocery Planner

A planner that lets users schedule meals, save favorites, and generate a grocery list. It can use local JSON recipe data plus local storage for saved plans and checklists, making it very feasible for the assignment requirements.

### Backup idea 3: Study Session Scheduler

An app that helps students create study blocks, organize subjects, and track completed sessions. It is simpler than a calendar-integrated planner but still supports validated forms, persistence, dropdowns, CSS animation, and URL-based view state.

## Recommended task split

- Teammate 1: HTML/CSS layout, responsive design, navigation, and accessibility pass.
- Teammate 2: Data model, local storage, forms, filters, and URL parameter logic.
- Shared later work: API integration, testing, polish, and final proposal assets such as wireframes and reflection bullets.

## Reflection starter bullets

These can be adjusted later for the required team checkpoint reflection.

- Role snapshot: one teammate handled layout and wireframes while the other handled data flow and form planning.
- Key decision: the team chose a planner dashboard because it matches course requirements and has long-term usefulness.
- Key decision: Google Calendar was selected as the first integration because the documentation is clearer for browser apps than a more complex LMS integration.
- Integration risk: Canvas support was downgraded to a stretch goal until API permissions can be verified.
- AI usage: AI helped brainstorm project scope and proposal wording, but all claims about requirements and integrations were checked against course instructions and official documentation.
