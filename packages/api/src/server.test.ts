/**
 * HTTP server bootstrap tests
 */

import { describe, it, expect } from "@effect/vitest"
import { main, SherryApi } from "./server.js"

describe("HTTP Server Bootstrap", () => {
  it("server exports main effect", () => {
    // Verify the main export exists
    expect(main).toBeDefined()
  })

  it("server exports SherryApi", () => {
    // Verify the API export exists
    expect(SherryApi).toBeDefined()
  })
})
