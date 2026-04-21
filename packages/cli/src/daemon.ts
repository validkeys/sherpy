/**
 * Daemon process management
 * PID tracking and lifecycle management
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const PID_FILE = join(homedir(), ".sherpy", "sherpy.pid");

/**
 * Check if a process is running
 */
function isProcessAlive(pid: number): boolean {
  try {
    // Signal 0 doesn't kill the process, just checks if it exists
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Read PID from file and verify process is alive
 * Returns PID if running, null otherwise
 */
export function readPid(): number | null {
  if (!existsSync(PID_FILE)) {
    return null;
  }

  try {
    const pidStr = readFileSync(PID_FILE, "utf8").trim();
    const pid = parseInt(pidStr, 10);

    if (isNaN(pid)) {
      return null;
    }

    if (isProcessAlive(pid)) {
      return pid;
    }

    // Stale PID file - remove it
    removePid();
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Write PID to file
 */
export function writePid(pid: number): void {
  const dir = dirname(PID_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(PID_FILE, String(pid), "utf8");
}

/**
 * Remove PID file
 */
export function removePid(): void {
  if (existsSync(PID_FILE)) {
    unlinkSync(PID_FILE);
  }
}
