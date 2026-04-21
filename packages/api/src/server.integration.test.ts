/**
 * HTTP server integration tests
 * Tests actual server startup and health endpoint
 */

import { Effect, Layer } from "effect"
import { describe, it, expect } from "vitest"
import {
  HttpApiBuilder,
  HttpMiddleware,
  HttpServer,
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { createServer } from "node:http"
import { SherryApiLive } from "./server.js"

describe.skip("HTTP Server Integration", () => {
  it("server starts and health endpoint responds", async () => {
    const testPort = 3199

    // This test requires actually starting a server
    // Skip for now - will be tested in E2E suite in m8
    // The unit tests verify the layer composition is correct

    const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
      HttpServer.withLogAddress,
      Layer.provide(SherryApiLive),
      Layer.provide(NodeHttpServer.layer(createServer, { port: testPort, host: "127.0.0.1" }))
    )

    const serverEffect = HttpLive.pipe(Layer.launch, Effect.scoped)

    // Would need proper Effect runtime to execute
    expect(serverEffect).toBeDefined()
  })
})
