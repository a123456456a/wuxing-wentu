import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 43123);
const tsc = path.join(root, "node_modules/typescript/lib/tsc.js");

const child = spawn(process.execPath, [tsc, "-w", "--preserveWatchOutput", "--pretty", "false"], {
  cwd: root,
  stdio: "inherit",
});

async function waitForBuild() {
  const target = path.join(root, "dist/js/main.js");
  for (let i = 0; i < 80; i += 1) {
    if (existsSync(target)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("编译超时，没有生成 dist/js/main.js");
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function contentType(file) {
  return types[path.extname(file)] ?? "application/octet-stream";
}

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  if (clean === "/" || clean === "/index.html") return path.join(root, "index.html");
  if (clean === "/styles.css") return path.join(root, "src/styles.css");
  if (clean.startsWith("/js/")) return path.join(root, "dist", clean);
  if (clean.startsWith("/vendor/")) return path.join(root, clean.slice(1));
  return null;
}

await waitForBuild();

const server = createServer(async (req, res) => {
  try {
    const file = resolveFile(req.url || "/");
    if (!file || !file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("未找到");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(String(error));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`五行问途已开： http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close();
  child.kill();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
