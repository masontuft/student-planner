# Student Planner

A student assignment tracker with Canvas LMS integration for BYUI's WDD 231 team project.

## Development Setup

The app is a static site served by VS Code Live Server. Canvas calendar sync requires a local proxy to work around Canvas's missing CORS headers.

### 1. Start the proxy server

In a terminal, run:

```bash
node proxy.js
```

You should see:

```
Canvas ICS proxy → http://localhost:3002/ics?url=<feed-url>
```

Keep this terminal running while you use the app.

### 2. Open the app

Open `index.html` with VS Code Live Server (right-click → **Open with Live Server**). The app will be served at `http://localhost:5500`.

### Canvas Feed Setup

1. In Canvas, go to **Calendar → Calendar Feed** (bottom-right corner)
2. Copy the feed URL
3. In the app, go to **Settings** and paste the URL under **Canvas LMS**
4. Click **Connect** — the proxy will fetch and validate the feed

> The proxy only accepts Canvas calendar feed URLs (`/feeds/calendars/…`) and is intended for local development only. For production, replace it with a Cloudflare Worker or serverless function.