# WDD 231 Team Project Proposal

## Team Project Information

**Team Members:** Austin Sego, Mason Tuft

**Project Name:** Study Buddy Planner

**Description of the Project:**
Study Buddy Planner is a responsive web application that helps students organize assignments, plan study sessions, and track deadlines across school, work, and personal life. Users can add tasks manually or import events from Google Calendar, filter by class or priority, and view everything in a combined daily or weekly schedule.

**Target Audience:**
High school and college students who juggle multiple classes, jobs, and responsibilities across tools like Google Calendar and Canvas.

---

## Project Requirements Questionnaire

**What will the detailed form be used for? What other forms might you need?**
The main form adds a new assignment or study task — collecting name, class subject, due date, due time, priority level, estimated duration, and notes, with validation on required fields and date logic. A secondary quick-entry form lets users add a lightweight goal for the day without filling every field.

**What data would you need to store in localStorage for persistence?**
User preferences, selected view, filter settings, manually created tasks, cached Google Calendar events, and task completion status — so everything persists across refreshes and return visits.

**What data will your app need? Is there an API or will you need to build your own dataset in a JSON file?**
The app uses two data sources: the Google Calendar API for real event retrieval in the browser, and a local JSON file for study tips, motivational quotes, and sample subject categories. Canvas import is a stretch goal depending on API access.

**Where would it make sense to use a drop-down menu or modal?**
Dropdowns for class subject, priority level, source filter (All / School / Personal), planner view, and sort order. A modal shows full task details, allows editing, and confirms deletions.

**Where are opportunities to use CSS Animations?**
Slide-in when a task is added, strikethrough/fade when marked complete, card expand/collapse for details, loading transitions during API fetch, and a slide-out mobile menu animation.

---

## Wireframe Notes

**Mobile layout:** Header with logo, date, and menu button → summary cards for today's tasks and events → Add Task button → vertical agenda list with time, title, source label, and status → bottom filter row (All / School / Personal / Completed) → slide-out menu for settings and connected accounts.

**Desktop layout:** Top bar with title and date selector → left sidebar (Today, Week, Tasks, Sources, Settings) → center panel for the day or week schedule → right panel for upcoming deadlines and selected item details → filter dropdowns for class, source, and priority.

---

## Scope and Risk Control

First milestone: fully working planner with local task creation, filtering, responsive UI, and URL-driven state (`?date=`, `?view=`, `?task=`). Google Calendar integration follows once the core app is stable. Canvas import is evaluated last based on remaining time and API permission access.

**Backup idea:** A simpler Assignment Tracker covering forms, localStorage, JSON data, filters, and responsive design — no third-party authentication required.

---

## Recommended Task Split

- **Austin:** HTML/CSS layout, responsive design, navigation, and accessibility.
- **Mason:** Data model, localStorage, forms, filters, URL parameter logic, and API integration.
- **Shared:** Testing, polish, wireframe assets, and final reflection.
