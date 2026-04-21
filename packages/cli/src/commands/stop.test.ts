/**
 * Tests for stop command
 * Tests graceful shutdown, error handling, and PID file cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { stopCommand } from "./stop.js";
import * as daemon from "../daemon.js";

// Mock dependencies
vi.mock("../daemon.js");

describe("stop command", () => {
  const mockPid = 12345;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(daemon.readPid).mockReturnValue(mockPid);
    vi.mocked(daemon.removePid).mockImplementation(() => {});

    // Mock process.kill to simulate successful signal sending
    vi.spyOn(process, "kill").mockImplementation(() => true);

    // Suppress console output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should stop daemon gracefully with SIGTERM", async () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(mockPid);

    // Mock process death - process.kill(pid, 0) should throw after SIGTERM
    let processAlive = true;
    vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (signal === "SIGTERM") {
        processAlive = false;
        return true;
      }
      if (signal === 0) {
        if (!processAlive) {
          const error = new Error("ESRCH") as NodeJS.ErrnoException;
          error.code = "ESRCH";
          throw error;
        }
        return true;
      }
      return true;
    });

    // Act
    const exitCode = await stopCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(process.kill).toHaveBeenCalledWith(mockPid, "SIGTERM");
    expect(daemon.removePid).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("Sherpy stopped");
  });

  it("should handle already stopped daemon gracefully", async () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(null);

    // Act
    const exitCode = await stopCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(console.log).toHaveBeenCalledWith("Sherpy is not running");
    expect(process.kill).not.toHaveBeenCalled();
    expect(daemon.removePid).not.toHaveBeenCalled();
  });

  it("should force kill with SIGKILL if graceful shutdown times out", async () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(mockPid);

    // Mock process that doesn't die on SIGTERM
    let attemptCount = 0;
    vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (signal === "SIGTERM") {
        return true;
      }
      if (signal === 0) {
        // Process stays alive for first 20+ attempts (simulating timeout)
        attemptCount++;
        if (attemptCount > 20) {
          const error = new Error("ESRCH") as NodeJS.ErrnoException;
          error.code = "ESRCH";
          throw error;
        }
        return true;
      }
      if (signal === "SIGKILL") {
        return true;
      }
      return true;
    });

    // Act
    const exitCode = await stopCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(process.kill).toHaveBeenCalledWith(mockPid, "SIGTERM");
    expect(process.kill).toHaveBeenCalledWith(mockPid, "SIGKILL");
    expect(daemon.removePid).toHaveBeenCalled();
  }, 15000);

  it("should clean up stale PID file when process doesn't exist", async () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(mockPid);

    // Mock process.kill to throw ESRCH (process not found)
    vi.spyOn(process, "kill").mockImplementation(() => {
      const error = new Error("ESRCH") as NodeJS.ErrnoException;
      error.code = "ESRCH";
      throw error;
    });

    // Act
    const exitCode = await stopCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(daemon.removePid).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("process was not running")
    );
  });

  it("should remove PID file after successful stop", async () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(mockPid);

    // Mock immediate process death
    let killed = false;
    vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (signal === "SIGTERM") {
        killed = true;
        return true;
      }
      if (signal === 0 && killed) {
        const error = new Error("ESRCH") as NodeJS.ErrnoException;
        error.code = "ESRCH";
        throw error;
      }
      return true;
    });

    // Act
    const exitCode = await stopCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(daemon.removePid).toHaveBeenCalled();
  });

  it("should return error code on unexpected failure", async () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(mockPid);

    // Mock unexpected error
    vi.spyOn(process, "kill").mockImplementation(() => {
      const error = new Error("EPERM") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    });

    // Act
    const exitCode = await stopCommand();

    // Assert
    expect(exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Error stopping Sherpy")
    );
  });

  it("should wait for process to exit before cleaning up", async () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(mockPid);

    const callOrder: string[] = [];
    let processAlive = true;

    vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (signal === "SIGTERM") {
        callOrder.push("SIGTERM");
        // Simulate delayed death
        setTimeout(() => {
          processAlive = false;
        }, 100);
        return true;
      }
      if (signal === 0) {
        callOrder.push("check-alive");
        if (!processAlive) {
          const error = new Error("ESRCH") as NodeJS.ErrnoException;
          error.code = "ESRCH";
          throw error;
        }
        return true;
      }
      return true;
    });

    vi.mocked(daemon.removePid).mockImplementation(() => {
      callOrder.push("removePid");
    });

    // Act
    const exitCode = await stopCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(callOrder[0]).toBe("SIGTERM");
    expect(callOrder[callOrder.length - 1]).toBe("removePid");
  });

  it("should log stopping message with PID", async () => {
    // Arrange
    const testPid = 99999;
    vi.mocked(daemon.readPid).mockReturnValue(testPid);

    let processAlive = true;
    vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (signal === "SIGTERM") {
        processAlive = false;
        return true;
      }
      if (signal === 0 && !processAlive) {
        const error = new Error("ESRCH") as NodeJS.ErrnoException;
        error.code = "ESRCH";
        throw error;
      }
      return true;
    });

    // Act
    await stopCommand();

    // Assert
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`Stopping Sherpy (PID: ${testPid})`)
    );
  });
});
