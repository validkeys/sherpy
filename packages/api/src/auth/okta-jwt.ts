/**
 * Okta JWT validation
 * Validates JWT tokens and extracts user claims
 */

import { Effect } from "effect";
import { UnauthorizedError } from "../errors/auth.js";
import { AuthService, type OktaClaims } from "./jwks-cache.js";

/**
 * Validate JWT token and extract claims
 */
export const validateJwt = (
  token: string,
): Effect.Effect<OktaClaims, UnauthorizedError, AuthService> =>
  Effect.gen(function* () {
    if (!token) {
      return yield* Effect.fail(new UnauthorizedError({ message: "No token provided" }));
    }

    // Remove "Bearer " prefix if present
    const cleanToken = token.startsWith("Bearer ") ? token.substring(7) : token;

    const authService = yield* AuthService;
    return yield* authService.validateToken(cleanToken);
  });

export { OktaClaims } from "./jwks-cache.js";
export { UnauthorizedError } from "../errors/auth.js";
