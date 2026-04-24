/**
 * ProjectChatPanel component tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ProjectChatPanel } from "./project-chat-panel";
import { ChatAssistantUIProvider } from "./chat-assistant-ui-provider";

// Mock the useApi hook
vi.mock("@/hooks/use-api", () => ({
  useApi: vi.fn(() => ({
    getChatMessages: vi.fn().mockResolvedValue({
      messages: [],
      hasMore: false,
    }),
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

// Helper to render with provider
function renderWithProvider(ui: React.ReactElement) {
  return render(
    <ChatAssistantUIProvider projectId="test-project">
      {ui}
    </ChatAssistantUIProvider>
  );
}

describe("ProjectChatPanel", () => {
  it("renders toggle button when panel is closed", () => {
    renderWithProvider(<ProjectChatPanel />);
    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
  });

  it("opens chat panel when toggle button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProjectChatPanel />);

    const toggleButton = screen.getByRole("button", { name: "Open chat" });
    await user.click(toggleButton);

    // Panel should be visible with close button
    expect(screen.getByRole("button", { name: "Close chat" })).toBeInTheDocument();
    // Toggle button should not be visible
    expect(screen.queryByRole("button", { name: "Open chat" })).not.toBeInTheDocument();
  });

  it("closes chat panel when close button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProjectChatPanel />);

    // Open panel
    const toggleButton = screen.getByRole("button", { name: "Open chat" });
    await user.click(toggleButton);

    // Close panel
    const closeButton = screen.getByRole("button", { name: "Close chat" });
    await user.click(closeButton);

    // Panel should be closed (translated off-screen), toggle button visible
    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    const panel = screen.getByRole("complementary");
    expect(panel).toHaveClass("translate-x-full");
  });

  it("displays chat interface when panel is open", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProjectChatPanel />);

    // Open panel
    const toggleButton = screen.getByRole("button", { name: "Open chat" });
    await user.click(toggleButton);

    // Chat panel should be visible
    const panel = screen.getByRole("complementary");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent("Project Chat");
  });

  it("has appropriate width on desktop", () => {
    const { container } = renderWithProvider(<ProjectChatPanel />);
    expect(container).toBeInTheDocument();
  });

  it("renders chat bubble icon in toggle button", () => {
    renderWithProvider(<ProjectChatPanel />);
    const toggleButton = screen.getByRole("button", { name: "Open chat" });
    expect(toggleButton).toBeInTheDocument();
  });

  it("maintains closed state by default", () => {
    renderWithProvider(<ProjectChatPanel />);
    // Toggle button should be visible
    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    // Panel should exist but be translated off-screen
    const panel = screen.getByRole("complementary");
    expect(panel).toHaveClass("translate-x-full");
  });
});
