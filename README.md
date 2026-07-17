# Student Planner

A student assignment tracker with Canvas LMS integration for BYUI's WDD 231 team project.

## Development Setup

The app is a static site plus one Netlify serverless function (`netlify/functions/ics.js`) that proxies Canvas calendar feeds to work around Canvas's missing CORS headers.

### Run the app locally

Install the [Netlify CLI](https://docs.netlify.com/cli/get-started/) if you don't have it, then from the project root run:

```bash
netlify dev
```

The app will be served at `http://localhost:8888` with the ICS proxy available at `/.netlify/functions/ics`. Both the static pages and Canvas sync work from this single command — no separate proxy process is needed.

### Canvas Feed Setup

1. In Canvas, go to **Calendar → Calendar Feed** (bottom-right corner)
2. Copy the feed URL
3. In the app, go to **Settings** and paste the URL under **Canvas LMS**
4. Click **Connect** — the proxy will fetch and validate the feed

> The proxy only accepts `https` Canvas calendar feed URLs on `*.instructure.com` (path `/feeds/calendars/…`). Requests to any other host are rejected to prevent the function being used as an open proxy.

## Project Structure

- `index.html` / `planner.html` / `studytips.html` / `settings.html` / `task-details.html` — pages
- `scripts/utils.js` — shared storage, validation, escaping, date, and nav helpers
- `scripts/canvas-sync.js` — Canvas ICS fetching, parsing, and merge logic (DOM-free)
- `scripts/main.js`, `scripts/planner.js`, `scripts/settings.js`, `scripts/task-details.js` — per-page code
- `netlify/functions/ics.js` — Canvas feed proxy
- `data/studyTips.json` — study tip data
- `docs/` — archived project proposal documents
