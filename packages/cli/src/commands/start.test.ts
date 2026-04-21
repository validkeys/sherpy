/**
 * Tests for start command
 * Tests daemon spawn, already-running detection, and PID file management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startCommand } from "./start.js";
import * as daemon from "../daemon.js";
import * as fs from "node:fs";
import * as childProcess from "node:child_process";

// Mock dependencies
vi.mock("../daemon.js");
vi.mock("node:fs");
vi.mock("node:child_process");

describe("start command", () => {
  const mockPid = 12345;
  let mockChildProcess: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock child process
    mockChildProcess = {
      pid: mockPid,
      unref: vi.fn(),
    };

    // Default mock implementations
    vi.mocked(daemon.readPid).mockReturnValue(null);
    vi.mocked(daemon.writePid).mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(childProcess.spawn).mockReturnValue(mockChildProcess);

    // Suppress console output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should start daemon when not already running", () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(null);

    // Act
    const exitCode = startCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(childProcess.spawn).toHaveBeenCalledWith(
      "node",
      expect.arrayContaining([expect.stringContaining("server.js")]),
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
        env: expect.objectContaining({
          NODE_ENV: "production",
          PORT: "3100",
        }),
      })
    );
    expect(daemon.writePid).toHaveBeenCalledWith(mockPid);
    expect(mockChildProcess.unref).toHaveBeenCalled();
  });

  it("should detect already running daemon", () => {
    // Arrange
    const existingPid = 99999;
    vi.mocked(daemon.readPid).mockReturnValue(existingPid);

    // Act
    const exitCode = startCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`already running (PID: ${existingPid})`)
    );
    expect(childProcess.spawn).not.toHaveBeenCalled();
    expect(daemon.writePid).not.toHaveBeenCalled();
  });

  it("should return error when API server not found", () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(null);
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Act
    const exitCode = startCommand();

    // Assert
    expect(exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("API server not found")
    );
    expect(childProcess.spawn).not.toHaveBeenCalled();
    expect(daemon.writePid).not.toHaveBeenCalled();
  });

  it("should handle spawn failure (no PID)", () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(null);
    mockChildProcess.pid = undefined;

    // Act
    const exitCode = startCommand();

    // Assert
    expect(exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to start daemon")
    );
    expect(daemon.writePid).not.toHaveBeenCalled();
  });

  it("should create PID file with correct process ID", () => {
    // Arrange
    const testPid = 54321;
    mockChildProcess.pid = testPid;
    vi.mocked(daemon.readPid).mockReturnValue(null);

    // Act
    const exitCode = startCommand();

    // Assert
    expect(exitCode).toBe(0);
    expect(daemon.writePid).toHaveBeenCalledWith(testPid);
  });

  it("should pass correct environment variables to daemon", () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(null);

    // Act
    startCommand();

    // Assert
    const spawnCall = vi.mocked(childProcess.spawn).mock.calls[0];
    const options = spawnCall?.[2];
    expect(options?.env).toMatchObject({
      NODE_ENV: "production",
      PORT: "3100",
      DB_PATH: expect.stringContaining(".sherpy/sherpy.db"),
    });
  });

  it("should spawn detached process with ignored stdio", () => {
    // Arrange
    vi.mocked(daemon.readPid).mockReturnValue(null);

    // Act
    startCommand();

    // Assert
    expect(childProcess.spawn).toHaveBeenCalledWith(
      "node",
      expect.any(Array),
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
      })
    );
  });
});
