#!/usr/bin/env node
// Serves _site/ at http://localhost:<port>/design-system-showcase/, the path GitHub Pages serves it under.
// Usage: node tools/serve.mjs [port]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const site = resolve(fileURLToPath(new URL("../_site", import.meta.url)));
export const BASE = "/design-system-showcase/";
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".ts": "text/plain; charset=utf-8", ".tsx": "text/plain; charset=utf-8" };

export function serve(port = 4173) {
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, "http://localhost");
    const send = (file, status = 200) => {
      response.writeHead(status, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
      createReadStream(file).pipe(response);
    };
    if (!pathname.startsWith(BASE)) {
      response.writeHead(pathname === "/" ? 302 : 404, pathname === "/" ? { location: BASE } : {});
      return response.end();
    }
    let file = normalize(join(site, decodeURIComponent(pathname.slice(BASE.length))));
    if (!file.startsWith(site)) return send(join(site, "404.html"), 404);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    return existsSync(file) ? send(file) : send(join(site, "404.html"), 404);
  });
  return new Promise((done) => server.listen(port, "127.0.0.1", () => done(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4173);
  await serve(port);
  console.log(`http://localhost:${port}${BASE}`);
}
