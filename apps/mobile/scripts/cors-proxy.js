/**
 * Lightweight CORS proxy for web development.
 *
 * External APIs (e.g. Infer) may not return CORS headers, so
 * browsers block direct requests. This proxy runs on localhost,
 * adds the required CORS headers, and forwards the request
 * server-side where CORS does not apply.
 *
 * Usage: node scripts/cors-proxy.js
 */
const http = require("http");

const PORT = 19007;

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Only POST is supported" }));
    return;
  }

  const targetUrl = req.headers["x-proxy-target"];

  if (!targetUrl) {
    res.writeHead(400, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing x-proxy-target header" }));
    return;
  }

  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    let parsedUrl;

    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      res.writeHead(400, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid target URL" }));
      return;
    }

    const transport = parsedUrl.protocol === "https:" ? require("https") : http;
    const forwardHeaders = {
      "Content-Type": req.headers["content-type"] || "application/json",
    };

    if (req.headers["authorization"]) {
      forwardHeaders["Authorization"] = req.headers["authorization"];
    }

    const proxyReq = transport.request(
      targetUrl,
      { headers: forwardHeaders, method: "POST" },
      (proxyRes) => {
        let responseBody = "";

        proxyRes.on("data", (chunk) => {
          responseBody += chunk;
        });

        proxyRes.on("end", () => {
          res.writeHead(proxyRes.statusCode || 502, {
            ...corsHeaders(),
            "Content-Type": proxyRes.headers["content-type"] || "application/json",
          });
          res.end(responseBody);
        });
      },
    );

    proxyReq.on("error", (error) => {
      res.writeHead(502, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message || "Proxy request failed" }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-proxy-target",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
  };
}

server.listen(PORT, () => {
  console.log(`[cors-proxy] Running on http://localhost:${PORT}`);
});
