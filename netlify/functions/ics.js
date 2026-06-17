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

  if (!targetUrl || !targetUrl.includes("/feeds/calendars/")) {
    return {
      statusCode: 400,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing or invalid url parameter. Must be a Canvas calendar feed URL." }),
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
