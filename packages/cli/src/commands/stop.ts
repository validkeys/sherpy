/**
 * Stop command - gracefully shutdown API daemon
 */

import { readPid, removePid } from "../daemon.js";

/**
 * Check if a process is running
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for process to exit with timeout
 */
async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
  const pollInterval = 500;
  const maxAttempts = Math.floor(timeoutMs / pollInterval);

  for (let i = 0; i < maxAttempts; i++) {
    if (!isProcessAlive(pid)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return false;
}

/**
 * Stop the API daemon
 */
export async function stopCommand(): Promise<number> {
  // Check if daemon is running
  const pid = readPid();
  if (pid === null) {
    console.log("Sherpy is not running");
    return 0;
  }

  console.log(`Stopping Sherpy (PID: ${pid})...`);

  try {
    // Send SIGTERM for graceful shutdown
    process.kill(pid, "SIGTERM");

    // Wait up to 10 seconds for process to exit
    const exited = await waitForExit(pid, 10000);

    if (!exited) {
      console.log("Process did not exit gracefully, forcing shutdown...");
      // Force kill with SIGKILL
      try {
        process.kill(pid, "SIGKILL");
        // Give it a moment to die
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Process might already be dead
      }
    }

    // Remove PID file
    removePid();
    console.log("Sherpy stopped");
    return 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") {
      // Process doesn't exist - clean up PID file
      removePid();
      console.log("Sherpy stopped (process was not running)");
      return 0;
    }

    console.error(`Error stopping Sherpy: ${(error as Error).message}`);
    return 1;
  }
}
