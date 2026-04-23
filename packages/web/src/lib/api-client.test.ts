/**
 * API Client Integration Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiClient, ApiError } from "./api-client";

describe("ApiClient", () => {
  let apiClient: ApiClient;
  let mockGetToken: ReturnType<typeof vi.fn>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetToken = vi.fn();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    apiClient = new ApiClient("http://localhost:3100", mockGetToken);
  });

  describe("constructor", () => {
    it("should create an API client with base URL and token getter", () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });
  });

  describe("request method", () => {
    it("should throw ApiError when no token is available", async () => {
      mockGetToken.mockResolvedValue(null);

      await expect(apiClient.listProjects()).rejects.toThrow(ApiError);
      await expect(apiClient.listProjects()).rejects.toThrow(
        "No authentication token available"
      );
    });

    it("should send request with correct headers", async () => {
      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ projects: [] }),
      });

      await apiClient.listProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3100/api/projects",
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
        })
      );
    });

    it("should parse successful JSON response", async () => {
      const mockProjects = [
        {
          id: "1",
          name: "Test Project",
          slug: "test-project",
          pipelineStatus: "intake",
          priority: "medium",
          assignedPeople: [],
          tags: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      });

      const result = await apiClient.listProjects();

      expect(result).toEqual({ projects: mockProjects });
    });

    it("should throw ApiError on 401 Unauthorized", async () => {
      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized", code: "UNAUTHORIZED" }),
      });

      await expect(apiClient.listProjects()).rejects.toThrow(ApiError);

      try {
        await apiClient.listProjects();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(401);
        expect((error as ApiError).message).toBe("Unauthorized");
        expect((error as ApiError).code).toBe("UNAUTHORIZED");
      }
    });

    it("should throw ApiError on 500 Server Error", async () => {
      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "Internal Server Error" }),
      });

      await expect(apiClient.listProjects()).rejects.toThrow(ApiError);

      try {
        await apiClient.listProjects();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
        expect((error as ApiError).message).toBe("Internal Server Error");
      }
    });

    it("should handle network errors", async () => {
      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(apiClient.listProjects()).rejects.toThrow(ApiError);

      try {
        await apiClient.listProjects();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(0);
        expect((error as ApiError).message).toBe("Network error");
      }
    });

    it("should handle malformed error responses", async () => {
      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(apiClient.listProjects()).rejects.toThrow(ApiError);

      try {
        await apiClient.listProjects();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toBe("HTTP 400");
      }
    });
  });

  describe("project endpoints", () => {
    beforeEach(() => {
      mockGetToken.mockResolvedValue("test-token");
    });

    it("should call GET /api/projects for listProjects", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ projects: [] }),
      });

      await apiClient.listProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3100/api/projects",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should call GET /api/projects/:id for getProject", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ project: {} }),
      });

      await apiClient.getProject("test-project-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3100/api/projects/test-project-id",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should call POST /api/projects for createProject", async () => {
      const createRequest = {
        name: "New Project",
        slug: "new-project",
        pipelineStatus: "intake" as const,
        priority: "medium" as const,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ project: { id: "new-id", ...createRequest } }),
      });

      await apiClient.createProject(createRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3100/api/projects",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(createRequest),
        })
      );
    });

    it("should call PATCH /api/projects/:id for updateProject", async () => {
      const updateRequest = {
        id: "test-id",
        name: "Updated Project",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ project: updateRequest }),
      });

      await apiClient.updateProject("test-id", updateRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3100/api/projects/test-id",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(updateRequest),
        })
      );
    });
  });

  describe("type inference", () => {
    it("should infer correct response type for listProjects", async () => {
      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ projects: [] }),
      });

      const result = await apiClient.listProjects();

      // Type assertion to verify type inference works
      expect(result.projects).toBeDefined();
      expect(Array.isArray(result.projects)).toBe(true);
    });

    it("should infer correct response type for getProject", async () => {
      mockGetToken.mockResolvedValue("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          project: {
            id: "1",
            name: "Test",
            slug: "test",
            pipelineStatus: "intake",
            priority: "medium",
          },
        }),
      });

      const result = await apiClient.getProject("1");

      // Type assertion to verify type inference works
      expect(result.project).toBeDefined();
      expect(result.project.id).toBeDefined();
      expect(result.project.name).toBeDefined();
    });
  });
});
