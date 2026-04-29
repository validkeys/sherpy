import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { router } from "./router";

describe("Router", () => {
  it("renders home page at root path", () => {
    render(<RouterProvider router={router} />);
    expect(screen.getByText(/Sherpy Flow UI Refactor/i)).toBeInTheDocument();
  });

  it("renders 404 page for unknown routes", async () => {
    const testRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/this-route-does-not-exist"],
    });

    render(<RouterProvider router={testRouter} />);
    expect(screen.getByText(/404/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });
});
