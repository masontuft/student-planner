import https from "https";

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const targetUrl = event.queryStringParameters?.url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing url parameter." }),
    };
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return {
      statusCode: 400,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Malformed URL." }),
    };
  }

  // Only proxy https Canvas calendar feeds — anything else (other hosts,
  // internal addresses, non-feed paths) is rejected to prevent SSRF.
  const hostname = parsed.hostname.toLowerCase();
  const isCanvasHost = hostname === "instructure.com" || hostname.endsWith(".instructure.com");

  if (parsed.protocol !== "https:" || !isCanvasHost || !parsed.pathname.startsWith("/feeds/calendars/")) {
    return {
      statusCode: 400,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "URL must be an https Canvas (instructure.com) calendar feed." }),
    };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { "User-Agent": "StudyBuddyPlanner/1.0" },
    };

    https.get(options, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        resolve({
          statusCode: proxyRes.statusCode,
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Canvas responded with ${proxyRes.statusCode}` }),
        });
        return;
      }

      const chunks = [];
      proxyRes.on("data", (chunk) => chunks.push(chunk));
      proxyRes.on("end", () => {
        resolve({
          statusCode: 200,
          headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8" },
          body: Buffer.concat(chunks).toString("utf-8"),
        });
      });
    }).on("error", (err) => {
      resolve({
        statusCode: 502,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: `Could not reach Canvas: ${err.message}` }),
      });
    });
  });
}
