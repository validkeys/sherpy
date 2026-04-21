/**
 * Sherpy API entry point
 * Server bootstrap function
 */

import * as Shared from "@sherpy/shared";

export * from "./services/index.js";
export * from "./api/index.js";
export * from "./db/index.js";
export * from "./auth/index.js";

export function bootstrap(): void {
  console.log("Sherpy API - placeholder", Shared);
}
