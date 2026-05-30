import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import http from "node:http";

const root = normalize(process.argv[2] || "dist");
const port = Number.parseInt(process.argv[3] || "8090", 10);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolvePath(urlPath) {
  const cleanPath = urlPath.split("?")[0].split("#")[0];
  const requested = normalize(join(root, cleanPath));

  if (requested.startsWith(root) && existsSync(requested)) {
    const stats = statSync(requested);
    if (stats.isFile()) {
      return requested;
    }
    const nestedIndex = join(requested, "index.html");
    if (existsSync(nestedIndex)) {
      return nestedIndex;
    }
  }

  return join(root, "index.html");
}

http
  .createServer((req, res) => {
    const filePath = resolvePath(req.url || "/");
    const extension = extname(filePath);
    res.statusCode = 200;
    res.setHeader(
      "Content-Type",
      mimeTypes[extension] || "application/octet-stream",
    );
    createReadStream(filePath).pipe(res);
  })
  .listen(port, () => {
    console.log(`SPA server listening on http://localhost:${port} serving ${root}`);
  });
