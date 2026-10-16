import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT || 43129);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  const clean = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404);
    res.end("未找到");
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
  res.end(body);
}).listen(port, "0.0.0.0", () => {
  console.log(`预览： http://127.0.0.1:${port}`);
});
