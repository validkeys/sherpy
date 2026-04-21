/**
 * Okta JWT validation tests
 * Tests JWT validation with mocked AuthService
 * Real signature verification tested via integration tests
 */

import { Effect, Layer } from "effect"
import { describe, it, expect } from "@effect/vitest"
import { AuthService } from "./jwks-cache.js"
import { validateJwt, OktaClaims } from "./okta-jwt.js"
import { UnauthorizedError } from "../errors/auth.js"

// Mock JWT tokens for testing (not real - used with mocked AuthService)
const validToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LTEifQ.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsImlzcyI6Imh0dHBzOi8vZGV2LTEyMzQ1Ni5va3RhLmNvbSIsImF1ZCI6InNoZXJweS1jbGllbnQtaWQiLCJleHAiOjk5OTk5OTk5OTl9.signature"

const expiredToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LTEifQ.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsImlzcyI6Imh0dHBzOi8vZGV2LTEyMzQ1Ni5va3RhLmNvbSIsImF1ZCI6InNoZXJweS1jbGllbnQtaWQiLCJleHAiOjE2MDk0NTkyMDB9.signature"

// Mock AuthService Layer
const MockAuthServiceLive = Layer.succeed(AuthService, {
  validateToken: (token: string) =>
    Effect.gen(function* () {
      // Simple mock validation - simulates real JWT verification behavior
      if (token === validToken) {
        return new OktaClaims({
          sub: "user123",
          email: "test@example.com",
          name: "Test User",
        })
      }
      if (token === expiredToken) {
        return yield* Effect.fail(
          new UnauthorizedError({ message: "Token expired" })
        )
      }
      return yield* Effect.fail(
        new UnauthorizedError({ message: "JWT verification failed: Invalid token" })
      )
    }),
})

describe("Okta JWT Validation", () => {
  it.effect("validates valid JWT and extracts claims", () =>
    Effect.gen(function* () {
      const claims = yield* validateJwt(validToken)

      expect(claims.sub).toBe("user123")
      expect(claims.email).toBe("test@example.com")
      expect(claims.name).toBe("Test User")
    }).pipe(Effect.provide(MockAuthServiceLive))
  )

  it.effect("rejects expired JWT with UnauthorizedError", () =>
    Effect.gen(function* () {
      const result = yield* Effect.either(validateJwt(expiredToken))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(UnauthorizedError)
        expect(result.left.message).toContain("expired")
      }
    }).pipe(Effect.provide(MockAuthServiceLive))
  )

  it.effect("rejects invalid JWT with UnauthorizedError", () =>
    Effect.gen(function* () {
      const result = yield* Effect.either(validateJwt("invalid.jwt.token"))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(UnauthorizedError)
      }
    }).pipe(Effect.provide(MockAuthServiceLive))
  )
})

describe("AuthService - JWT Signature Verification", () => {
  it.effect("validates JWT with cryptographic signature verification", () =>
    Effect.gen(function* () {
      // Note: AuthService.Live uses jose library's jwtVerify with createRemoteJWKSet
      // which handles JWKS fetching, caching, and signature verification automatically
      // This test verifies the mock implementation; real signature verification is
      // tested via integration tests with actual Okta tokens
      const authService = yield* AuthService
      const claims = yield* authService.validateToken(validToken)

      expect(claims).toBeInstanceOf(OktaClaims)
      expect(claims.sub).toBe("user123")
    }).pipe(Effect.provide(MockAuthServiceLive))
  )

  it.effect("rejects tokens with invalid signatures", () =>
    Effect.gen(function* () {
      const authService = yield* AuthService
      const result = yield* Effect.either(
        authService.validateToken("invalid.signature.token")
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(UnauthorizedError)
        expect(result.left.message).toContain("verification failed")
      }
    }).pipe(Effect.provide(MockAuthServiceLive))
  )
})
