import { spawnSync } from "node:child_process";
import { cpSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsc = path.join(root, "node_modules/typescript/lib/tsc.js");
const result = spawnSync(process.execPath, [tsc, "--pretty", "false"], { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);

const dist = path.join(root, "dist");
mkdirSync(path.join(dist, "vendor"), { recursive: true });
copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
copyFileSync(path.join(root, "src/styles.css"), path.join(dist, "styles.css"));
cpSync(path.join(root, "vendor/react"), path.join(dist, "vendor/react"), { recursive: true });
cpSync(path.join(root, "vendor/react-dom"), path.join(dist, "vendor/react-dom"), { recursive: true });
console.log("构建完成：dist/");
