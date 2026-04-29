import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ClassifiedError,
  ErrorType,
  classifyError,
  createNavigationStrategy,
  createReloadStrategy,
  createRetryStrategy,
  generateErrorId,
  logError,
} from "./error-utils";

describe("error-utils", () => {
  describe("generateErrorId", () => {
    it("generates unique error IDs", () => {
      const id1 = generateErrorId();
      const id2 = generateErrorId();

      expect(id1).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("classifyError", () => {
    it("classifies network errors", () => {
      const error = new TypeError("Failed to fetch");
      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.Network);
      expect(classified.message).toBe("Network connection failed");
      expect(classified.retryable).toBe(true);
      expect(classified.isRecoverable).toBe(true);
      expect(classified.userMessage).toContain("Unable to connect");
    });

    it("classifies authentication errors (401)", () => {
      const error = { status: 401, message: "Unauthorized" };
      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.Authentication);
      expect(classified.retryable).toBe(false);
      expect(classified.isRecoverable).toBe(true);
      expect(classified.userMessage).toContain("session has expired");
    });

    it("classifies authentication errors (403)", () => {
      const error = { status: 403, message: "Forbidden" };
      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.Authentication);
      expect(classified.retryable).toBe(false);
    });

    it("classifies validation errors (400-499)", () => {
      const error = { status: 400, message: "Bad Request" };
      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.Validation);
      expect(classified.retryable).toBe(false);
      expect(classified.isRecoverable).toBe(true);
    });

    it("classifies server errors (500+)", () => {
      const error = { status: 500, message: "Internal Server Error" };
      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.Api);
      expect(classified.retryable).toBe(true);
      expect(classified.userMessage).toContain("server error");
    });

    it("classifies generic Error instances", () => {
      const error = new Error("Something went wrong");
      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.Unknown);
      expect(classified.message).toBe("Something went wrong");
      expect(classified.retryable).toBe(true);
    });

    it("classifies unknown error types", () => {
      const error = "string error";
      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.Unknown);
      expect(classified.message).toBe("Unknown error");
      expect(classified.retryable).toBe(true);
    });

    it("generates error ID for all classifications", () => {
      const error = new Error("Test");
      const classified = classifyError(error);

      expect(classified.errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
    });
  });

  describe("logError", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleGroupSpy: ReturnType<typeof vi.spyOn>;
    let consoleGroupEndSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      consoleGroupSpy = vi.spyOn(console, "group").mockImplementation(() => {});
      consoleGroupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleGroupSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it("logs error with context", () => {
      const error: ClassifiedError = {
        type: ErrorType.Network,
        message: "Network failed",
        originalError: new Error("Test"),
        errorId: "err_123",
        userMessage: "Connection failed",
        isRecoverable: true,
        retryable: true,
      };

      logError(error, { userId: "123" });

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("logs error information", () => {
      const error: ClassifiedError = {
        type: ErrorType.Api,
        message: "Server error",
        originalError: new Error("Test"),
        errorId: "err_456",
        userMessage: "Server error occurred",
        isRecoverable: true,
        retryable: true,
      };

      logError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("recovery strategies", () => {
    describe("createRetryStrategy", () => {
      it("creates a retry strategy that checks retryable flag", () => {
        const retryFn = vi.fn();
        const strategy = createRetryStrategy(retryFn);

        const retryableError: ClassifiedError = {
          type: ErrorType.Network,
          message: "Network error",
          originalError: new Error(),
          errorId: "err_1",
          userMessage: "Error",
          isRecoverable: true,
          retryable: true,
        };

        const nonRetryableError: ClassifiedError = {
          ...retryableError,
          retryable: false,
        };

        expect(strategy.canRecover(retryableError)).toBe(true);
        expect(strategy.canRecover(nonRetryableError)).toBe(false);
      });

      it("executes retry function on recover", async () => {
        const retryFn = vi.fn().mockResolvedValue(undefined);
        const strategy = createRetryStrategy(retryFn);

        const error: ClassifiedError = {
          type: ErrorType.Network,
          message: "Network error",
          originalError: new Error(),
          errorId: "err_1",
          userMessage: "Error",
          isRecoverable: true,
          retryable: true,
        };

        await strategy.recover(error);
        expect(retryFn).toHaveBeenCalledTimes(1);
      });
    });

    describe("createNavigationStrategy", () => {
      it("creates a navigation strategy", () => {
        const strategy = createNavigationStrategy("/home");
        const error: ClassifiedError = {
          type: ErrorType.Unknown,
          message: "Error",
          originalError: new Error(),
          errorId: "err_1",
          userMessage: "Error",
          isRecoverable: true,
          retryable: false,
        };

        expect(strategy.canRecover(error)).toBe(true);
      });

      it("navigates to specified path on recover", () => {
        const originalLocation = window.location.href;
        const strategy = createNavigationStrategy("/test");

        Object.defineProperty(window, "location", {
          value: { href: "" },
          writable: true,
        });

        const error: ClassifiedError = {
          type: ErrorType.Unknown,
          message: "Error",
          originalError: new Error(),
          errorId: "err_1",
          userMessage: "Error",
          isRecoverable: true,
          retryable: false,
        };

        strategy.recover(error);
        expect(window.location.href).toBe("/test");

        Object.defineProperty(window, "location", {
          value: { href: originalLocation },
          writable: true,
        });
      });
    });

    describe("createReloadStrategy", () => {
      it("creates a reload strategy", () => {
        const strategy = createReloadStrategy();
        const error: ClassifiedError = {
          type: ErrorType.Unknown,
          message: "Error",
          originalError: new Error(),
          errorId: "err_1",
          userMessage: "Error",
          isRecoverable: true,
          retryable: false,
        };

        expect(strategy.canRecover(error)).toBe(true);
      });

      it("reloads window on recover", () => {
        const reloadSpy = vi.fn();
        Object.defineProperty(window.location, "reload", {
          value: reloadSpy,
          writable: true,
        });

        const strategy = createReloadStrategy();
        const error: ClassifiedError = {
          type: ErrorType.Unknown,
          message: "Error",
          originalError: new Error(),
          errorId: "err_1",
          userMessage: "Error",
          isRecoverable: true,
          retryable: false,
        };

        strategy.recover(error);
        expect(reloadSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
