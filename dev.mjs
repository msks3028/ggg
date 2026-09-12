import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const backend = path.join(root, "backend", "index.js");
const children = [];

function run(name, command, args, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env },
    windowsHide: false,
  });
  children.push(child);
  child.on("error", (err) => console.error(`[${name}] failed to start: ${err.message}`));
  child.on("exit", (code, signal) => {
    if (signal) console.log(`[${name}] stopped by ${signal}`);
    else if (code && code !== 0) console.error(`[${name}] stopped with code ${code}`);
  });
  return child;
}

console.log("\nLurnova development mode: Backend + Frontend");
console.log("Backend:  http://localhost:5000");
console.log("Frontend: http://localhost:5173\n");

// Use the current Node executable directly. This avoids Windows cmd.exe/npm
// spawning problems and guarantees that the backend in THIS project is used.
run("backend", process.execPath, [backend], path.join(root, "backend"));
run("frontend", process.execPath, ["node_modules/vite/bin/vite.js", "--host"]);

function shutdown() {
  for (const child of children) {
    if (!child?.pid || child.killed) continue;
    try { child.kill(); } catch {}
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
