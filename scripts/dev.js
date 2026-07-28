// Runs the backend (Express) and frontend (Vite) together, with labeled,
// color-coded output — same idea as the "concurrently" package, but using
// only Node's built-in child_process so there's nothing extra to install
// and nothing that can fail to install on any given machine/OS.
import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

const colors = {
  SERVER: "\x1b[34m", // blue
  CLIENT: "\x1b[32m", // green
  reset: "\x1b[0m",
};

function run(label, args) {
  const child = spawn(npmCmd, args, { shell: true });

  const prefix = `${colors[label]}[${label}]${colors.reset}`;

  child.stdout.on("data", (data) => {
    data
      .toString()
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .forEach((line) => console.log(`${prefix} ${line}`));
  });

  child.stderr.on("data", (data) => {
    data
      .toString()
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .forEach((line) => console.error(`${prefix} ${line}`));
  });

  child.on("exit", (code) => {
    console.log(`${prefix} exited with code ${code}`);
    // If either process dies, shut down the other one too rather than
    // leaving a half-running app.
    shutdown();
  });

  return child;
}

const children = [];

function shutdown() {
  children.forEach((c) => {
    if (!c.killed) c.kill();
  });
  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

children.push(run("SERVER", ["run", "server"]));
children.push(run("CLIENT", ["run", "dev"]));
