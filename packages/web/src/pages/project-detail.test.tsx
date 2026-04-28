/**
 * ProjectDetailPage integration test
 * Tests for infinite remount bug with Suspense + AuthProvider
 */

import { AuthProvider } from "@/components/auth/auth-provider";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectDetailPage, projectCache } from "./project-detail";

// Mock Okta auth client (must be before AuthProvider import)
vi.mock("@/lib/auth", () => ({
  authClient: {
    isAuthenticated: vi.fn().mockResolvedValue(true),
    getUser: vi.fn().mockResolvedValue({ email: "test@example.com" }),
    tokenManager: {
      get: vi.fn().mockResolvedValue({ accessToken: "mock-token" }),
    },
    authStateManager: {
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    signInWithRedirect: vi.fn(),
    signOut: vi.fn(),
  },
}));

// Mock the API client
const mockGetProject = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApi: vi.fn(() => ({
    getProject: mockGetProject,
    getChatMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
    sendChatMessage: vi.fn().mockResolvedValue({
      message: {
        id: "msg-1",
        projectId: "test-project",
        role: "assistant",
        content: "Test response",
        createdAt: new Date().toISOString(),
      },
    }),
  })),
}));

// Mock WebSocket
vi.mock("@/hooks/use-websocket", () => ({
  useWebSocket: vi.fn(() => ({
    connectionState: "disconnected",
    subscribe: vi.fn(() => vi.fn()),
  })),
}));

// Track render counts
let renderCount = 0;
const originalUseEffect = vi.fn();

describe("ProjectDetailPage - Infinite Remount Bug", () => {
  beforeEach(() => {
    renderCount = 0;
    vi.clearAllMocks();

    // Clear cache between tests
    projectCache.clear();

    // Enable DEV_MODE to bypass Okta
    vi.stubEnv("VITE_DEV_MODE", "true");

    // Mock successful API response
    mockGetProject.mockResolvedValue({
      project: {
        id: "test-project-id",
        name: "Test Project",
        description: "Test Description",
        pipelineStatus: "planning",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("should NOT infinitely remount when loading project", async () => {
    // Track how many times the component tree renders
    const renderCounts = { authProvider: 0, protectedRoute: 0, projectPage: 0 };

    const TestWrapper = () => {
      renderCounts.authProvider++;
      return (
        <AuthProvider>
          {renderCounts.protectedRoute++}
          <MemoryRouter initialEntries={["/projects/test-project-id"]}>
            <Routes>
              <Route
                path="/projects/:projectId"
                element={
                  <>
                    {renderCounts.projectPage++}
                    <ProjectDetailPage />
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );
    };

    render(<TestWrapper />);

    // Wait for Suspense to resolve
    await waitFor(
      () => {
        // In React Strict Mode, components render twice
        // So we expect at most 4-6 renders (2-3 cycles)
        // NOT 100+ renders like the bug produces
        expect(renderCounts.projectPage).toBeLessThan(10);
      },
      { timeout: 3000 },
    );

    // Verify the component actually rendered
    expect(mockGetProject).toHaveBeenCalled();

    // Print final counts for debugging
    console.log("Final render counts:", renderCounts);
  });

  it("should stabilize after promise resolves", async () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/projects/test-project-id"]}>
          <Routes>
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    // Wait for the promise to resolve
    await waitFor(
      () => {
        expect(mockGetProject).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Give it a moment to stabilize
    await new Promise((resolve) => setTimeout(resolve, 500));

    // The component should be stable now (no infinite loop)
    expect(container).toBeInTheDocument();

    // Should have made API call but not infinitely
    const callCount = mockGetProject.mock.calls.length;
    expect(callCount).toBeLessThan(5); // Allow for initial + React Strict Mode double render
  });

  it("should not create new API clients on every render", async () => {
    let apiClientCount = 0;

    // Override the useApi mock to track instantiation
    vi.mocked(await import("@/hooks/use-api")).useApi.mockImplementation(() => {
      apiClientCount++;
      return {
        getProject: mockGetProject,
        getChatMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
        sendChatMessage: vi.fn().mockResolvedValue({
          message: {
            id: "msg-1",
            projectId: "test-project",
            role: "assistant",
            content: "Test",
            createdAt: new Date().toISOString(),
          },
        }),
      };
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/projects/test-project-id"]}>
          <Routes>
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(
      () => {
        expect(mockGetProject).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Should not have created 100+ API clients
    expect(apiClientCount).toBeLessThan(10);
  });
});
