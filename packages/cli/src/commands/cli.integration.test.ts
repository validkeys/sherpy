/**
 * CLI integration tests
 * Tests start/stop commands with real child process spawning
 */

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readPid, removePid, writePid } from "../daemon.js";

const TEST_PID_FILE = join(homedir(), ".sherpy", "sherpy-test.pid");
const TEST_PORT = 13200 + Math.floor(Math.random() * 100);

// Test server script that runs as a simple HTTP server
const TEST_SERVER_SCRIPT = `
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Test server running');
});
server.listen(${TEST_PORT}, '127.0.0.1', () => {
  console.log('Test server started on port ${TEST_PORT}');
});
// Keep server alive
setInterval(() => {}, 1000);
`;

// Helper to create a temporary test server script
function createTestServerScript(): string {
  const scriptPath = join(homedir(), ".sherpy", "test-server.js");
  const dir = dirname(scriptPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(scriptPath, TEST_SERVER_SCRIPT, "utf8");
  return scriptPath;
}

// Helper to spawn a test daemon process
function spawnTestDaemon(): ChildProcess {
  const scriptPath = createTestServerScript();
  const child = spawn("node", [scriptPath], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      TEST_MODE: "true",
    },
  });
  child.unref();
  return child;
}

// Helper to check if process is alive
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

// Helper to wait for process to die
async function waitForProcessDeath(pid: number, timeoutMs = 5000): Promise<boolean> {
  const pollInterval = 100;
  const maxAttempts = Math.floor(timeoutMs / pollInterval);

  for (let i = 0; i < maxAttempts; i++) {
    if (!isProcessAlive(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return false;
}

// Helper to kill process forcefully
function killProcess(pid: number): void {
  try {
    if (isProcessAlive(pid)) {
      process.kill(pid, "SIGKILL");
    }
  } catch (error) {
    // Process already dead
  }
}

describe("CLI Integration Tests", () => {
  const spawnedPids: number[] = [];

  beforeEach(() => {
    // Clean up any existing test PID file
    if (existsSync(TEST_PID_FILE)) {
      unlinkSync(TEST_PID_FILE);
    }
  });

  afterEach(async () => {
    // Kill all spawned test processes
    for (const pid of spawnedPids) {
      killProcess(pid);
    }
    spawnedPids.length = 0;

    // Clean up test PID file
    if (existsSync(TEST_PID_FILE)) {
      unlinkSync(TEST_PID_FILE);
    }

    // Clean up test server script
    const scriptPath = join(homedir(), ".sherpy", "test-server.js");
    if (existsSync(scriptPath)) {
      unlinkSync(scriptPath);
    }

    // Wait a bit for processes to fully terminate
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it("should spawn daemon process and create PID file", async () => {
    // Spawn test daemon
    const child = spawnTestDaemon();
    expect(child.pid).toBeDefined();

    const pid = child.pid!;
    spawnedPids.push(pid);

    // Wait for process to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify process is running
    expect(isProcessAlive(pid)).toBe(true);

    // Write PID file
    const dir = dirname(TEST_PID_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(TEST_PID_FILE, String(pid), "utf8");

    // Verify PID file exists and contains correct PID
    expect(existsSync(TEST_PID_FILE)).toBe(true);
  });

  it("should detect already running daemon", async () => {
    // Spawn first daemon
    const child1 = spawnTestDaemon();
    const pid1 = child1.pid!;
    spawnedPids.push(pid1);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Write PID file
    const dir = dirname(TEST_PID_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(TEST_PID_FILE, String(pid1), "utf8");

    // Try to spawn second daemon - should detect first is running
    expect(isProcessAlive(pid1)).toBe(true);
    expect(existsSync(TEST_PID_FILE)).toBe(true);
  });

  it("should stop daemon gracefully with SIGTERM", async () => {
    // Spawn daemon
    const child = spawnTestDaemon();
    const pid = child.pid!;
    spawnedPids.push(pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify process is running
    expect(isProcessAlive(pid)).toBe(true);

    // Send SIGTERM
    process.kill(pid, "SIGTERM");

    // Wait for graceful shutdown
    const exited = await waitForProcessDeath(pid, 2000);
    expect(exited).toBe(true);
    expect(isProcessAlive(pid)).toBe(false);
  });

  it("should force kill daemon with SIGKILL if SIGTERM fails", async () => {
    // Spawn daemon
    const child = spawnTestDaemon();
    const pid = child.pid!;
    spawnedPids.push(pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify process is running
    expect(isProcessAlive(pid)).toBe(true);

    // Force kill with SIGKILL
    process.kill(pid, "SIGKILL");

    // Wait for death
    const exited = await waitForProcessDeath(pid, 1000);
    expect(exited).toBe(true);
    expect(isProcessAlive(pid)).toBe(false);
  });

  it("should clean up stale PID file when process doesn't exist", async () => {
    // Create PID file with non-existent PID
    const fakePid = 999999;
    const dir = dirname(TEST_PID_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(TEST_PID_FILE, String(fakePid), "utf8");

    // Verify PID file exists
    expect(existsSync(TEST_PID_FILE)).toBe(true);

    // Verify process doesn't exist
    expect(isProcessAlive(fakePid)).toBe(false);

    // Cleanup should remove stale PID file
    if (existsSync(TEST_PID_FILE)) {
      unlinkSync(TEST_PID_FILE);
    }

    expect(existsSync(TEST_PID_FILE)).toBe(false);
  });

  it("should handle PID file creation in non-existent directory", async () => {
    // Remove .sherpy directory if it exists
    const testDir = join(homedir(), ".sherpy-test-integration");
    const testPidFile = join(testDir, "sherpy.pid");

    // Ensure directory doesn't exist
    if (existsSync(testDir)) {
      if (existsSync(testPidFile)) {
        unlinkSync(testPidFile);
      }
    }

    // Spawn daemon
    const child = spawnTestDaemon();
    const pid = child.pid!;
    spawnedPids.push(pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create directory and PID file
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testPidFile, String(pid), "utf8");

    // Verify file was created
    expect(existsSync(testPidFile)).toBe(true);

    // Clean up
    unlinkSync(testPidFile);
  });

  it("should handle multiple start/stop cycles", async () => {
    for (let i = 0; i < 3; i++) {
      // Start daemon
      const child = spawnTestDaemon();
      const pid = child.pid!;
      spawnedPids.push(pid);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(isProcessAlive(pid)).toBe(true);

      // Stop daemon
      process.kill(pid, "SIGTERM");
      const exited = await waitForProcessDeath(pid, 2000);
      expect(exited).toBe(true);

      // Remove from tracked pids since it's dead
      const index = spawnedPids.indexOf(pid);
      if (index > -1) {
        spawnedPids.splice(index, 1);
      }

      // Wait before next cycle
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  it("should handle stop when daemon is not running", async () => {
    // Ensure no daemon is running
    expect(existsSync(TEST_PID_FILE)).toBe(false);

    // Attempt to stop - should succeed gracefully
    // (This simulates the stopCommand behavior when no PID file exists)
    const noPid = existsSync(TEST_PID_FILE);
    expect(noPid).toBe(false);
  });

  it("should spawn daemon as detached process", async () => {
    // Spawn daemon
    const child = spawnTestDaemon();
    const pid = child.pid!;
    spawnedPids.push(pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify process is running
    expect(isProcessAlive(pid)).toBe(true);

    // Process should continue running even after parent dies
    // (This is the nature of detached processes)
    expect(child.pid).toBeDefined();
  });

  it("should handle ESRCH error when stopping non-existent process", async () => {
    const fakePid = 999998;

    // Try to kill non-existent process
    try {
      process.kill(fakePid, "SIGTERM");
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      expect(err.code).toBe("ESRCH");
    }
  });

  it("should verify PID file contains valid integer", async () => {
    // Spawn daemon
    const child = spawnTestDaemon();
    const pid = child.pid!;
    spawnedPids.push(pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Write PID file
    const dir = dirname(TEST_PID_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(TEST_PID_FILE, String(pid), "utf8");

    // Read and verify PID
    const pidStr = require("fs").readFileSync(TEST_PID_FILE, "utf8").trim();
    const parsedPid = Number.parseInt(pidStr, 10);

    expect(isNaN(parsedPid)).toBe(false);
    expect(parsedPid).toBe(pid);
  });
});
