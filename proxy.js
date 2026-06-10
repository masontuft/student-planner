/**
 * Canvas ICS Proxy — local development only
 *
 * Fetches Canvas calendar feeds server-side to bypass the browser's
 * CORS restriction. Canvas does not send Access-Control-Allow-Origin
 * headers, so direct browser requests are blocked.
 *
 * Usage: node proxy.js
 * Endpoint: GET http://localhost:3002/ics?url=<encoded-canvas-feed-url>
 *
 * For production, replace this with a Cloudflare Worker or a
 * Vercel/Netlify serverless function using the same logic below.
 */

import http  from "http";
import https from "https";

const PORT = 3002;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const queryStart = req.url.indexOf("?");
  const params     = new URLSearchParams(queryStart !== -1 ? req.url.slice(queryStart + 1) : "");
  const targetUrl  = params.get("url");

  // Only proxy Canvas calendar feed URLs
  if (!targetUrl || !targetUrl.includes("/feeds/calendars/")) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing or invalid url parameter. Must be a Canvas calendar feed URL." }));
    return;
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Malformed URL." }));
    return;
  }

  const options = {
    hostname: parsed.hostname,
    path:     parsed.pathname + parsed.search,
    headers:  { "User-Agent": "StudyBuddyPlanner/1.0" },
  };

  https.get(options, (proxyRes) => {
    if (proxyRes.statusCode !== 200) {
      res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Canvas responded with ${proxyRes.statusCode}` }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/calendar; charset=utf-8" });
    proxyRes.pipe(res);
  }).on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Could not reach Canvas: ${err.message}` }));
  });
});

server.listen(PORT, () => {
  console.log(`Canvas ICS proxy → http://localhost:${PORT}/ics?url=<feed-url>`);
});
