/**
 * Start command - spawns API daemon
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readPid, writePid } from "../daemon.js";

const PORT = 3100;
const DB_PATH = join(homedir(), ".sherpy", "sherpy.db");

/**
 * Open URL in default browser (cross-platform)
 */
function openBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";

  spawn(command, [url], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

/**
 * Start the API daemon
 */
export function startCommand(): number {
  // Check if daemon already running
  const existingPid = readPid();
  if (existingPid !== null) {
    console.log(`Sherpy is already running (PID: ${existingPid})`);
    console.log(`Visit http://localhost:${PORT}`);
    return 0;
  }

  // Find the API server entry point
  // Try multiple potential paths to locate the monorepo root
  const cwd = process.cwd();
  const potentialPaths = [
    // When running from root
    join(cwd, "packages", "api", "dist", "server.js"),
    // When running from packages/cli
    join(cwd, "..", "api", "dist", "server.js"),
    // When installed globally (not yet implemented)
  ];

  let apiServerPath: string | null = null;
  for (const path of potentialPaths) {
    if (existsSync(path)) {
      apiServerPath = path;
      break;
    }
  }

  if (!apiServerPath) {
    console.error("Error: API server not found. Please run 'pnpm run build' first.");
    return 1;
  }

  // Spawn the API server as a detached daemon
  const child = spawn("node", [apiServerPath], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      DB_PATH: DB_PATH,
    },
  });

  // Unref so CLI can exit
  child.unref();

  // Save PID
  if (child.pid) {
    writePid(child.pid);
    console.log(`Sherpy started on http://localhost:${PORT}`);

    // Open browser after short delay
    setTimeout(() => openBrowser(`http://localhost:${PORT}`), 1000);

    return 0;
  } else {
    console.error("Error: Failed to start daemon");
    return 1;
  }
}
