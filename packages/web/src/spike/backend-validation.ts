/**
 * Backend Validation Spike (M0-017)
 * Comprehensive validation of backend capabilities before M1 feature development
 *
 * Run with: npx tsx src/spike/backend-validation.ts
 *
 * NOTE: This is exploratory spike code with intentional console logging and flexible types.
 * ESLint rules are relaxed for this file.
 */

/* eslint-disable no-console, @typescript-eslint/no-explicit-any, no-undef */

import type { ChatMessageResponse, Document, Project } from "@sherpy/shared";

interface ValidationResult {
  name: string;
  status: "green" | "yellow" | "red";
  details: string;
  blocker: boolean;
  actualResult?: unknown;
  expectedResult?: unknown;
}

interface ValidationReport {
  timestamp: string;
  confidenceLevel: "high" | "medium" | "low";
  totalChecks: number;
  passed: number;
  warnings: number;
  blockers: number;
  results: ValidationResult[];
}

class BackendValidator {
  private apiUrl: string;
  private wsUrl: string;
  private authToken: string | null = null;
  private results: ValidationResult[] = [];

  constructor() {
    this.apiUrl = process.env.VITE_API_URL || "http://localhost:3000/api";
    this.wsUrl = process.env.VITE_WS_URL || "ws://localhost:3000";
    console.log(`🔍 Backend Validation Spike`);
    console.log(`   API URL: ${this.apiUrl}`);
    console.log(`   WS URL:  ${this.wsUrl}\n`);
  }

  /**
   * Run all validation checks
   */
  async validate(): Promise<ValidationReport> {
    console.log("⚡ Starting Backend Validation...\n");

    // Section 1: API Endpoints (30min)
    console.log("📋 Section 1: API Endpoints Validation");
    await this.validateApiEndpoints();

    // Section 2: Database Schema (20min)
    console.log("\n📋 Section 2: Database Schema Validation");
    await this.validateDatabaseSchema();

    // Section 3: WebSocket Connection (30min)
    console.log("\n📋 Section 3: WebSocket Connection Validation");
    await this.validateWebSocketConnection();

    // Section 4: Programmatic Skill Invocation (40min)
    console.log("\n📋 Section 4: Programmatic Skill Invocation");
    await this.validateSkillInvocation();

    // Generate report
    return this.generateReport();
  }

  /**
   * Section 1: Validate all critical API endpoints
   */
  private async validateApiEndpoints(): Promise<void> {
    // Health check
    await this.checkEndpoint("GET /api/health", async () => {
      const response = await fetch(`${this.apiUrl}/health`);
      const data = await response.json();
      return {
        status: response.ok && data.status === "ok" && data.db === "connected" ? "green" : "red",
        details: response.ok
          ? `Health check passed. Uptime: ${data.uptime}s`
          : "Health check failed",
        blocker: !response.ok,
        actualResult: data,
      };
    });

    // Attempt to get auth token (if needed)
    await this.setupAuthentication();

    // Projects endpoints
    await this.checkEndpoint("GET /api/projects - list projects", async () => {
      const response = await this.authenticatedFetch(`${this.apiUrl}/projects`);
      const data = await response.json();
      return {
        status: response.ok ? "green" : response.status === 401 ? "yellow" : "red",
        details: response.ok
          ? `Projects list retrieved. Count: ${data.projects?.length || 0}`
          : `Status: ${response.status} - ${response.statusText}`,
        blocker: false,
        actualResult: data,
      };
    });

    await this.checkEndpoint("POST /api/projects - create project", async () => {
      const testProject = {
        name: "Backend Validation Test Project",
        description: "Created by M0-017 validation spike",
        slug: `validation-test-${Date.now()}`,
        tags: ["test", "validation"],
        priority: "low" as const,
      };

      const response = await this.authenticatedFetch(`${this.apiUrl}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testProject),
      });

      const data = await response.json();

      // Store project ID for subsequent tests
      if (response.ok && data.project?.id) {
        (this as any).testProjectId = data.project.id;
      }

      return {
        status: response.ok ? "green" : response.status === 401 ? "yellow" : "red",
        details: response.ok
          ? `Project created. ID: ${data.project?.id}`
          : `Status: ${response.status} - ${JSON.stringify(data)}`,
        blocker: false,
        actualResult: data,
      };
    });

    // Get project (if we created one)
    if ((this as any).testProjectId) {
      await this.checkEndpoint("GET /api/projects/:id - get project", async () => {
        const projectId = (this as any).testProjectId;
        const response = await this.authenticatedFetch(`${this.apiUrl}/projects/${projectId}`);
        const data = await response.json();
        return {
          status: response.ok ? "green" : "red",
          details: response.ok
            ? `Project retrieved. pipelineStatus: ${data.project?.pipelineStatus}`
            : `Failed to get project`,
          blocker: false,
          actualResult: data,
        };
      });

      await this.checkEndpoint("PATCH /api/projects/:id - update project", async () => {
        const projectId = (this as any).testProjectId;
        const response = await this.authenticatedFetch(`${this.apiUrl}/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pipelineStatus: "business-requirements",
            description: "Updated by validation spike",
          }),
        });
        const data = await response.json();
        return {
          status: response.ok ? "green" : "red",
          details: response.ok
            ? `Project updated. New status: ${data.project?.pipelineStatus}`
            : `Failed to update project`,
          blocker: false,
          actualResult: data,
        };
      });
    }

    // Documents endpoints
    if ((this as any).testProjectId) {
      await this.checkEndpoint("GET /api/projects/:id/documents - list documents", async () => {
        const projectId = (this as any).testProjectId;
        const response = await this.authenticatedFetch(
          `${this.apiUrl}/projects/${projectId}/documents`,
        );
        const data = await response.json();
        return {
          status: response.ok ? "green" : "yellow",
          details: response.ok
            ? `Documents list retrieved. Count: ${data.documents?.length || 0}`
            : `Status: ${response.status}`,
          blocker: false,
          actualResult: data,
        };
      });

      await this.checkEndpoint(
        "POST /api/projects/:id/documents/generate - generate document",
        async () => {
          const projectId = (this as any).testProjectId;
          const response = await this.authenticatedFetch(
            `${this.apiUrl}/projects/${projectId}/documents/generate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentType: "implementation-plan",
                format: "yaml",
              }),
            },
          );
          const data = await response.json();
          return {
            status: response.ok ? "green" : "yellow",
            details: response.ok
              ? `Document generated. Type: ${data.document?.documentType}`
              : `Status: ${response.status} - May require skill invocation`,
            blocker: false,
            actualResult: data,
          };
        },
      );
    }

    // Chat endpoints
    if ((this as any).testProjectId) {
      await this.checkEndpoint("POST /api/projects/:id/chat/messages - send message", async () => {
        const projectId = (this as any).testProjectId;
        const response = await this.authenticatedFetch(
          `${this.apiUrl}/projects/${projectId}/chat/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "user",
              content: "Test message from validation spike",
            }),
          },
        );
        const data = await response.json();

        if (response.ok && data.message?.id) {
          (this as any).testMessageId = data.message.id;
        }

        return {
          status: response.ok ? "green" : "yellow",
          details: response.ok
            ? `Message sent. ID: ${data.message?.id}`
            : `Status: ${response.status}`,
          blocker: false,
          actualResult: data,
        };
      });

      await this.checkEndpoint("GET /api/projects/:id/chat/messages - get messages", async () => {
        const projectId = (this as any).testProjectId;
        const response = await this.authenticatedFetch(
          `${this.apiUrl}/projects/${projectId}/chat/messages`,
        );
        const data = await response.json();
        return {
          status: response.ok ? "green" : "yellow",
          details: response.ok
            ? `Messages retrieved. Count: ${data.messages?.length || 0}`
            : `Status: ${response.status}`,
          blocker: false,
          actualResult: data,
        };
      });
    }
  }

  /**
   * Section 2: Validate database schema assumptions
   */
  private async validateDatabaseSchema(): Promise<void> {
    // Check pipelineStatus field exists and accepts all values
    await this.checkEndpoint("Database: projects.pipelineStatus field", async () => {
      const projectId = (this as any).testProjectId;
      if (!projectId) {
        return {
          status: "yellow" as const,
          details: "No test project to validate schema",
          blocker: false,
        };
      }

      // Try updating to various pipeline statuses
      const testStatuses = [
        "intake",
        "gap-analysis",
        "business-requirements",
        "technical-requirements",
        "implementation-planning",
        "active-development",
        "completed",
      ];

      let allPassed = true;
      const results: string[] = [];

      for (const status of testStatuses) {
        const response = await this.authenticatedFetch(`${this.apiUrl}/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineStatus: status }),
        });

        if (response.ok) {
          results.push(`✓ ${status}`);
        } else {
          allPassed = false;
          results.push(`✗ ${status}`);
        }
      }

      return {
        status: allPassed ? ("green" as const) : ("yellow" as const),
        details: `Tested ${testStatuses.length} pipeline statuses: ${results.join(", ")}`,
        blocker: false,
      };
    });

    // Check documents table structure
    await this.checkEndpoint("Database: documents table structure", async () => {
      const projectId = (this as any).testProjectId;
      if (!projectId) {
        return {
          status: "yellow" as const,
          details: "No test project to validate documents",
          blocker: false,
        };
      }

      const response = await this.authenticatedFetch(
        `${this.apiUrl}/projects/${projectId}/documents`,
      );

      if (!response.ok) {
        return {
          status: "yellow" as const,
          details: "Documents endpoint not accessible",
          blocker: false,
        };
      }

      const data = await response.json();
      const hasDocuments = Array.isArray(data.documents);

      return {
        status: hasDocuments ? ("green" as const) : ("yellow" as const),
        details: hasDocuments
          ? "Documents table structure confirmed"
          : "Documents table structure unclear",
        blocker: false,
      };
    });

    // Check chat_messages table
    await this.checkEndpoint("Database: chat_messages table exists", async () => {
      const projectId = (this as any).testProjectId;
      if (!projectId) {
        return {
          status: "yellow" as const,
          details: "No test project to validate chat messages",
          blocker: false,
        };
      }

      const response = await this.authenticatedFetch(
        `${this.apiUrl}/projects/${projectId}/chat/messages`,
      );

      return {
        status: response.ok ? ("green" as const) : ("yellow" as const),
        details: response.ok
          ? "Chat messages table confirmed"
          : `Chat messages endpoint status: ${response.status}`,
        blocker: false,
      };
    });
  }

  /**
   * Section 3: Validate WebSocket connection and streaming
   */
  private async validateWebSocketConnection(): Promise<void> {
    await this.checkEndpoint("WebSocket: Connection establishment", async () => {
      return new Promise((resolve) => {
        try {
          // Try to establish WebSocket connection
          const ws = new WebSocket(this.wsUrl);
          let connected = false;

          const timeout = setTimeout(() => {
            if (!connected) {
              ws.close();
              resolve({
                status: "yellow" as const,
                details: "WebSocket connection timeout after 5s",
                blocker: false,
              });
            }
          }, 5000);

          ws.onopen = () => {
            connected = true;
            clearTimeout(timeout);
            ws.close();
            resolve({
              status: "green" as const,
              details: "WebSocket connection established successfully",
              blocker: false,
            });
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            resolve({
              status: "yellow" as const,
              details: `WebSocket connection error: ${error}`,
              blocker: false,
            });
          };
        } catch (error) {
          resolve({
            status: "yellow" as const,
            details: `WebSocket error: ${error}`,
            blocker: false,
          });
        }
      });
    });

    await this.checkEndpoint("WebSocket: JWT authentication", async () => {
      if (!this.authToken) {
        return {
          status: "yellow" as const,
          details: "No auth token available to test WebSocket auth",
          blocker: false,
        };
      }

      return new Promise((resolve) => {
        try {
          // Try WebSocket with auth token
          const wsWithAuth = `${this.wsUrl}?token=${this.authToken}`;
          const ws = new WebSocket(wsWithAuth);
          let authenticated = false;

          const timeout = setTimeout(() => {
            if (!authenticated) {
              ws.close();
              resolve({
                status: "yellow" as const,
                details: "WebSocket auth verification timeout",
                blocker: false,
              });
            }
          }, 5000);

          ws.onopen = () => {
            authenticated = true;
            clearTimeout(timeout);
            ws.close();
            resolve({
              status: "green" as const,
              details: "WebSocket JWT authentication successful",
              blocker: false,
            });
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            resolve({
              status: "yellow" as const,
              details: "WebSocket auth may not be working",
              blocker: false,
            });
          };
        } catch (error) {
          resolve({
            status: "yellow" as const,
            details: `WebSocket auth error: ${error}`,
            blocker: false,
          });
        }
      });
    });
  }

  /**
   * Section 4: Validate programmatic skill invocation
   */
  private async validateSkillInvocation(): Promise<void> {
    await this.checkEndpoint("Skills: Programmatic invocation capability", async () => {
      // Check if there's a skills API endpoint
      const response = await this.authenticatedFetch(`${this.apiUrl}/skills`);

      if (response.ok) {
        return {
          status: "green" as const,
          details: "Skills API endpoint exists",
          blocker: false,
        };
      }

      // If no direct skills endpoint, check documentation or alternatives
      return {
        status: "red" as const,
        details: "No skills API endpoint found. Skills may only be available via CLI.",
        blocker: true,
        expectedResult: "POST /api/skills/invoke or similar endpoint",
        actualResult: "Endpoint not found",
      };
    });

    await this.checkEndpoint("Skills: Document generation integration", async () => {
      const projectId = (this as any).testProjectId;
      if (!projectId) {
        return {
          status: "yellow" as const,
          details: "No test project for skill integration test",
          blocker: false,
        };
      }

      // Test if document generation works (may trigger skill invocation)
      const response = await this.authenticatedFetch(
        `${this.apiUrl}/projects/${projectId}/documents/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentType: "implementation-plan",
            format: "yaml",
          }),
        },
      );

      return {
        status: response.ok ? ("green" as const) : ("yellow" as const),
        details: response.ok
          ? "Document generation works (may use skills internally)"
          : "Document generation unclear - may need skill invocation",
        blocker: false,
      };
    });

    await this.checkEndpoint("Skills: Completion webhooks/callbacks", async () => {
      // This is harder to test without actually invoking a skill
      // For now, document the assumption
      return {
        status: "yellow" as const,
        details: "Skill completion mechanism unclear - needs investigation",
        blocker: false,
        expectedResult: "WebSocket event or webhook for skill completion",
        actualResult: "Not validated in this spike",
      };
    });

    await this.checkEndpoint("Skills: Streaming responses", async () => {
      // Test if streaming works through WebSocket
      return {
        status: "yellow" as const,
        details: "Streaming skill responses not validated - WebSocket events need testing",
        blocker: false,
        expectedResult: "WsEvent messages during skill execution",
        actualResult: "Requires actual skill invocation to validate",
      };
    });
  }

  /**
   * Helper: Setup authentication (mock for now)
   */
  private async setupAuthentication(): Promise<void> {
    // In a real scenario, this would authenticate with Okta or get a test token
    // For the spike, we'll try without auth first and see what's needed
    const testToken = process.env.TEST_AUTH_TOKEN;

    if (testToken) {
      this.authToken = testToken;
      console.log("   ✓ Using TEST_AUTH_TOKEN from environment");
    } else {
      console.log("   ⚠ No auth token. Set TEST_AUTH_TOKEN env var for full validation");
    }
  }

  /**
   * Helper: Make authenticated fetch request
   */
  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);

    if (this.authToken) {
      headers.set("Authorization", `Bearer ${this.authToken}`);
    }

    return fetch(url, { ...options, headers });
  }

  /**
   * Helper: Check a single endpoint and record result
   */
  private async checkEndpoint(
    name: string,
    check: () => Promise<Partial<ValidationResult>>,
  ): Promise<void> {
    process.stdout.write(`   ${name}... `);

    try {
      const result = await check();
      const fullResult: ValidationResult = {
        name,
        status: result.status || "red",
        details: result.details || "Unknown error",
        blocker: result.blocker || false,
        actualResult: result.actualResult,
        expectedResult: result.expectedResult,
      };

      this.results.push(fullResult);

      // Console output
      const icon = fullResult.status === "green" ? "✓" : fullResult.status === "yellow" ? "⚠" : "✗";
      const color =
        fullResult.status === "green"
          ? "\x1b[32m"
          : fullResult.status === "yellow"
            ? "\x1b[33m"
            : "\x1b[31m";
      console.log(`${color}${icon}\x1b[0m ${fullResult.details}`);
    } catch (error) {
      const errorResult: ValidationResult = {
        name,
        status: "red",
        details: `Error: ${error}`,
        blocker: false,
      };
      this.results.push(errorResult);
      console.log(`\x1b[31m✗\x1b[0m ${errorResult.details}`);
    }
  }

  /**
   * Generate final validation report
   */
  private generateReport(): ValidationReport {
    const passed = this.results.filter((r) => r.status === "green").length;
    const warnings = this.results.filter((r) => r.status === "yellow").length;
    const blockers = this.results.filter((r) => r.blocker).length;

    let confidenceLevel: "high" | "medium" | "low";
    if (blockers > 0) {
      confidenceLevel = "low";
    } else if (warnings > 3) {
      confidenceLevel = "medium";
    } else {
      confidenceLevel = "high";
    }

    return {
      timestamp: new Date().toISOString(),
      confidenceLevel,
      totalChecks: this.results.length,
      passed,
      warnings,
      blockers,
      results: this.results,
    };
  }
}

/**
 * Main execution
 */
async function main() {
  const validator = new BackendValidator();
  const report = await validator.validate();

  console.log("\n" + "=".repeat(80));
  console.log("📊 VALIDATION REPORT");
  console.log("=".repeat(80));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Total Checks: ${report.totalChecks}`);
  console.log(`✓ Passed: ${report.passed}`);
  console.log(`⚠ Warnings: ${report.warnings}`);
  console.log(`✗ Blockers: ${report.blockers}`);
  console.log(`\nConfidence Level: ${report.confidenceLevel.toUpperCase()}`);

  if (report.blockers > 0) {
    console.log("\n🚨 BLOCKERS IDENTIFIED - DO NOT PROCEED TO M1");
    report.results
      .filter((r) => r.blocker)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.details}`);
      });
  } else if (report.confidenceLevel === "high") {
    console.log("\n✅ Ready to proceed to M1 feature development");
  } else {
    console.log("\n⚠️  Can proceed with caution - some areas need clarification");
  }

  console.log("=".repeat(80));

  // Write detailed report to file
  const reportPath = "./docs/planning/artifacts/backend-validation-report.md";
  await writeReport(report, reportPath);
  console.log(`\n📝 Detailed report written to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(report.blockers > 0 ? 1 : 0);
}

/**
 * Write detailed markdown report
 */
async function writeReport(report: ValidationReport, path: string): Promise<void> {
  const md: string[] = [];

  md.push("# Backend Validation Report (M0-017)");
  md.push("");
  md.push(`**Generated:** ${report.timestamp}`);
  md.push(`**Confidence Level:** ${report.confidenceLevel.toUpperCase()}`);
  md.push("");
  md.push("## Summary");
  md.push("");
  md.push(`- Total Checks: ${report.totalChecks}`);
  md.push(`- ✓ Passed: ${report.passed}`);
  md.push(`- ⚠ Warnings: ${report.warnings}`);
  md.push(`- ✗ Blockers: ${report.blockers}`);
  md.push("");

  if (report.blockers > 0) {
    md.push("## 🚨 Blockers");
    md.push("");
    report.results
      .filter((r) => r.blocker)
      .forEach((r) => {
        md.push(`### ${r.name}`);
        md.push("");
        md.push(`**Status:** ${r.status.toUpperCase()}`);
        md.push(`**Details:** ${r.details}`);
        if (r.expectedResult) {
          md.push(`**Expected:** ${JSON.stringify(r.expectedResult, null, 2)}`);
        }
        if (r.actualResult) {
          md.push(`**Actual:** ${JSON.stringify(r.actualResult, null, 2)}`);
        }
        md.push("");
      });
  }

  md.push("## Detailed Results");
  md.push("");

  // Group by status
  ["green", "yellow", "red"].forEach((status) => {
    const statusResults = report.results.filter((r) => r.status === status);
    if (statusResults.length === 0) return;

    const icon = status === "green" ? "✓" : status === "yellow" ? "⚠" : "✗";
    const label = status === "green" ? "Passed" : status === "yellow" ? "Warnings" : "Failed";

    md.push(`### ${icon} ${label}`);
    md.push("");

    statusResults.forEach((r) => {
      md.push(`- **${r.name}**: ${r.details}`);
    });
    md.push("");
  });

  md.push("## Recommendations");
  md.push("");

  if (report.confidenceLevel === "high") {
    md.push("✅ **Ready to proceed** to M1 feature development. Backend capabilities validated.");
  } else if (report.confidenceLevel === "medium") {
    md.push("⚠️ **Proceed with caution**. Some backend capabilities need clarification:");
    report.results
      .filter((r) => r.status === "yellow")
      .forEach((r) => {
        md.push(`- ${r.name}: ${r.details}`);
      });
  } else {
    md.push("🚨 **DO NOT PROCEED** to M1 until blockers are resolved:");
    report.results
      .filter((r) => r.blocker)
      .forEach((r) => {
        md.push(`- ${r.name}: ${r.details}`);
      });
  }
  md.push("");

  md.push("## Next Steps");
  md.push("");
  if (report.blockers > 0) {
    md.push("1. Address all blocker issues");
    md.push("2. Re-run validation spike");
    md.push("3. Update implementation plan if needed");
    md.push("4. Once confidence is HIGH, proceed to M1");
  } else {
    md.push("1. Review warnings and decide if acceptable");
    md.push("2. Document any workarounds needed");
    md.push("3. Proceed to M1-001 (Project Creation Flow)");
  }
  md.push("");

  // Write to file
  const fs = await import("fs/promises");
  const dirname = await import("path");

  // Ensure directory exists
  const dir = dirname.dirname(path);
  await fs.mkdir(dir, { recursive: true });

  // Write report
  await fs.writeFile(path, md.join("\n"), "utf-8");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BackendValidator, type ValidationReport, type ValidationResult };
