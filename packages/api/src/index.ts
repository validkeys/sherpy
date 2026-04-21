/**
 * Sherpy API entry point
 * Exports the main server effect for daemon startup
 */

export * from "./services/index.js"
export * from "./api/index.js"
export * from "./db/index.js"
export * from "./auth/index.js"
export * from "./server.js"

import { main } from "./server.js"
import { NodeRuntime } from "@effect/platform-node"

/**
 * Bootstrap function for CLI daemon
 */
export function bootstrap(): void {
  NodeRuntime.runMain(main)
}
