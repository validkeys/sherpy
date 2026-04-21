/**
 * JWKS cache service
 * Fetches and caches Okta JWKS keys for JWT signature verification
 */

import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Config, Context, Effect, Layer, Schema } from "effect"
import { UnauthorizedError } from "../errors/auth.js"

/**
 * JWKS key structure from Okta
 */
class JwksKey extends Schema.Class<JwksKey>("JwksKey")({
  kty: Schema.String,
  kid: Schema.String,
  use: Schema.String,
  n: Schema.String,
  e: Schema.String,
}) {}

/**
 * JWKS response from Okta endpoint
 */
class JwksResponse extends Schema.Class<JwksResponse>("JwksResponse")({
  keys: Schema.Array(JwksKey),
}) {}

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
    readonly getJwks: () => Effect.Effect<JwksResponse, UnauthorizedError>
    readonly validateToken: (
      token: string
    ) => Effect.Effect<OktaClaims, UnauthorizedError>
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient
      const oktaDomain = yield* Config.string("OKTA_DOMAIN").pipe(
        Config.withDefault("https://dev-123456.okta.com")
      )

      // JWKS cache - simple in-memory cache
      let cachedJwks: JwksResponse | null = null
      let cacheExpiry: number = 0

      const getJwks = () =>
        Effect.gen(function* () {
          const now = Date.now()

          // Return cached if still valid (1 hour TTL)
          if (cachedJwks && now < cacheExpiry) {
            return cachedJwks
          }

          // Fetch from Okta
          const jwksUrl = `${oktaDomain}/.well-known/jwks.json`
          const response = yield* HttpClientRequest.get(jwksUrl).pipe(
            httpClient.execute,
            Effect.flatMap(HttpClientResponse.schemaBodyJson(JwksResponse)),
            Effect.catchAll((error) =>
              Effect.fail(
                new UnauthorizedError({
                  message: `Failed to fetch JWKS: ${String(error)}`,
                })
              )
            )
          )

          // Cache for 1 hour
          cachedJwks = response
          cacheExpiry = now + 60 * 60 * 1000

          return response
        })

      const validateToken = (token: string) =>
        Effect.gen(function* () {
          // Get JWKS for signature verification
          yield* getJwks()

          // TODO: Actual JWT signature verification
          // For now, this is a placeholder that will be implemented
          // with a JWT library (jsonwebtoken or jose)

          // Decode JWT payload (base64url decode middle part)
          const parts = token.split(".")
          if (parts.length !== 3 || !parts[1]) {
            return yield* Effect.fail(
              new UnauthorizedError({ message: "Invalid JWT format" })
            )
          }

          try {
            const payload = JSON.parse(
              Buffer.from(parts[1], "base64url").toString()
            )

            // Verify expiration
            const now = Math.floor(Date.now() / 1000)
            if (payload.exp && payload.exp < now) {
              return yield* Effect.fail(
                new UnauthorizedError({ message: "Token expired" })
              )
            }

            // Verify issuer and audience
            const clientId = yield* Config.string("OKTA_CLIENT_ID").pipe(
              Config.withDefault("sherpy-client-id"),
              Effect.orDie
            )

            if (payload.iss !== oktaDomain) {
              return yield* Effect.fail(
                new UnauthorizedError({ message: "Invalid issuer" })
              )
            }

            if (payload.aud !== clientId) {
              return yield* Effect.fail(
                new UnauthorizedError({ message: "Invalid audience" })
              )
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
                message: `JWT decode failed: ${String(error)}`,
              })
            )
          }
        })

      return {
        getJwks,
        validateToken,
      } as const
    })
  )
}
