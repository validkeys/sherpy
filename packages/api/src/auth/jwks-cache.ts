/**
 * JWKS cache service
 * Fetches and caches Okta JWKS keys for JWT signature verification
 */

import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Config, Context, Effect, Layer, Schema } from "effect"
import { UnauthorizedError } from "../errors/auth.js"
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

/**
 * Okta user claims extracted from JWT
 */
export class OktaClaims extends Schema.Class<OktaClaims>("OktaClaims")({
  sub: Schema.String,
  email: Schema.String,
  name: Schema.String,
}) {}

/**
 * AuthService - handles JWKS fetching and JWT validation
 */
export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    readonly validateToken: (
      token: string
    ) => Effect.Effect<OktaClaims, UnauthorizedError>
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const oktaDomain = yield* Config.string("OKTA_DOMAIN").pipe(
        Config.withDefault("https://dev-123456.okta.com")
      )

      const validateToken = (token: string) =>
        Effect.gen(function* () {
          // Get client ID for audience validation
          const clientId = yield* Config.string("OKTA_CLIENT_ID").pipe(
            Config.withDefault("sherpy-client-id"),
            Effect.orDie
          )

          // Create JWKS resolver - jose handles caching internally
          const jwksUrl = new URL(`${oktaDomain}/.well-known/jwks.json`)
          const JWKS = createRemoteJWKSet(jwksUrl)

          try {
            // Verify JWT signature, expiration, issuer, and audience
            const verifyResult = yield* Effect.tryPromise({
              try: () =>
                jwtVerify(token, JWKS, {
                  issuer: oktaDomain,
                  audience: clientId,
                }),
              catch: (error) =>
                new UnauthorizedError({
                  message: `JWT verification failed: ${String(error)}`,
                }),
            })

            const payload = verifyResult.payload as JWTPayload & {
              email?: string
              name?: string
            }

            // Extract claims
            return new OktaClaims({
              sub: payload.sub || "unknown",
              email: payload.email || "unknown@example.com",
              name: payload.name || "Unknown User",
            })
          } catch (error) {
            return yield* Effect.fail(
              new UnauthorizedError({
                message: `JWT validation failed: ${String(error)}`,
              })
            )
          }
        })

      return {
        validateToken,
      } as const
    })
  )
}
