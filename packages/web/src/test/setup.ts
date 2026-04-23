/**
 * Vitest test setup
 */

import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.stubEnv("VITE_API_URL", "http://localhost:3100");
vi.stubEnv("VITE_OKTA_DOMAIN", "https://dev-test.okta.com");
vi.stubEnv("VITE_OKTA_CLIENT_ID", "test-client-id");
