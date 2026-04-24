/**
 * Typed API Client for REST endpoints
 */

import type {
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectResponse,
  ListProjectsResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
} from "@sherpy/shared";

/**
 * API Error with typed status and message
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Typed API Client for all REST endpoints
 */
export class ApiClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string | null>,
  ) {}

  /**
   * Generic HTTP request with type safety
   */
  private async request<TRes>(method: string, endpoint: string, body?: unknown): Promise<TRes> {
    const token = await this.getToken();
    if (!token) {
      throw new ApiError(401, "No authentication token available");
    }

    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.message || `HTTP ${response.status}`,
          errorData.code,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, error instanceof Error ? error.message : "Network error");
    }
  }

  // Project endpoints
  async createProject(request: CreateProjectRequest): Promise<CreateProjectResponse> {
    return this.request("POST", "/api/projects", request);
  }

  async listProjects(): Promise<ListProjectsResponse> {
    return this.request("GET", "/api/projects");
  }

  async getProject(projectId: string): Promise<GetProjectResponse> {
    return this.request("GET", `/api/projects/${projectId}`);
  }

  async updateProject(
    projectId: string,
    request: UpdateProjectRequest,
  ): Promise<UpdateProjectResponse> {
    return this.request("PATCH", `/api/projects/${projectId}`, request);
  }

  // Task endpoints (TODO: implement when API routes are available)
  async updateTaskStatus(taskId: string, status: string): Promise<unknown> {
    return this.request("PATCH", `/api/tasks/${taskId}/status`, { status });
  }

  // People endpoints (TODO: implement when API routes are available)
  async listPeople(): Promise<unknown> {
    return this.request("GET", "/api/people");
  }

  async createPerson(request: unknown): Promise<unknown> {
    return this.request("POST", "/api/people", request);
  }

  async updatePerson(personId: string, request: Record<string, unknown>): Promise<unknown> {
    return this.request("PATCH", `/api/people/${personId}`, request);
  }

  // Assignment endpoints (TODO: implement when API routes are available)
  async assignPerson(taskId: string, personId: string, allocation: number): Promise<unknown> {
    return this.request("POST", "/api/assignments", { taskId, personId, allocation });
  }

  async unassignPerson(assignmentId: string): Promise<unknown> {
    return this.request("DELETE", `/api/assignments/${assignmentId}`);
  }

  // Resource endpoints (TODO: implement when API routes are available)
  async getResourceAllocation(projectId?: string): Promise<unknown> {
    const query = projectId ? `?projectId=${projectId}` : "";
    return this.request("GET", `/api/resources/allocation${query}`);
  }

  async detectConflicts(projectId?: string): Promise<unknown> {
    const query = projectId ? `?projectId=${projectId}` : "";
    return this.request("GET", `/api/resources/conflicts${query}`);
  }

  // Document endpoints (TODO: implement when API routes are available)
  async getDocuments(projectId: string): Promise<unknown> {
    return this.request("GET", `/api/projects/${projectId}/documents`);
  }

  async getDocument(projectId: string, documentType: string): Promise<unknown> {
    return this.request("GET", `/api/projects/${projectId}/documents/${documentType}`);
  }

  async exportDocument(projectId: string, documentType: string, format: string): Promise<unknown> {
    return this.request(
      "GET",
      `/api/projects/${projectId}/documents/${documentType}/export?format=${format}`,
    );
  }

  // Schedule endpoints (TODO: implement when API routes are available)
  async generateSchedule(projectId: string): Promise<unknown> {
    return this.request("POST", `/api/projects/${projectId}/schedule`);
  }

  async createScenario(projectId: string, scenario: unknown): Promise<unknown> {
    return this.request("POST", `/api/projects/${projectId}/scenarios`, scenario);
  }

  async whatIfReschedule(projectId: string, changes: unknown): Promise<unknown> {
    return this.request("POST", `/api/projects/${projectId}/schedule/what-if`, changes);
  }

  async listScheduleSnapshots(projectId: string): Promise<unknown> {
    return this.request("GET", `/api/projects/${projectId}/schedule/snapshots`);
  }

  // Chat message endpoints
  async sendChatMessage(
    projectId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<{
    message: {
      id: string;
      projectId: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
    };
  }> {
    return this.request("POST", `/api/projects/${projectId}/chat/messages`, {
      role,
      content,
    });
  }

  async getChatMessages(
    projectId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<{
    messages: Array<{
      id: string;
      projectId: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
    }>;
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.cursor) params.set("cursor", options.cursor);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request("GET", `/api/projects/${projectId}/chat/messages${query}`);
  }
}

/**
 * Factory function to create API client
 */
export function createApiClient(
  baseUrl: string,
  getToken: () => Promise<string | null>,
): ApiClient {
  return new ApiClient(baseUrl, getToken);
}
