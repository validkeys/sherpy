/**
 * WebSocket endpoint for real-time events
 * Handles WebSocket connections with JWT authentication and event broadcasting
 */

import type { WsEvent } from "@sherpy/shared";
import { Context, Effect, Layer, Ref, Schema } from "effect";
import { AuthService, type OktaClaims } from "../auth/jwks-cache.js";
import { UnauthorizedError } from "../errors/auth.js";

/**
 * WebSocket connection interface
 * Abstraction over actual WebSocket implementation
 */
export interface WebSocketConnection {
  readonly id: string;
  readonly send: (data: string) => Effect.Effect<void>;
  readonly close: () => Effect.Effect<void>;
}

/**
 * EventBroadcaster Service
 * Manages WebSocket connection pool and broadcasts events to all connected clients
 */
export class EventBroadcaster extends Context.Tag("EventBroadcaster")<
  EventBroadcaster,
  {
    readonly addConnection: (conn: WebSocketConnection) => Effect.Effect<void>;
    readonly removeConnection: (conn: WebSocketConnection) => Effect.Effect<void>;
    readonly getConnectionCount: () => Effect.Effect<number>;
    readonly broadcast: (event: WsEvent) => Effect.Effect<void>;
  }
>() {
  static readonly Default = Layer.effect(
    this,
    Effect.gen(function* () {
      // Connection pool - Set of active WebSocket connections
      const connections = yield* Ref.make(new Set<WebSocketConnection>());

      /**
       * Add a connection to the pool
       */
      const addConnection = (conn: WebSocketConnection): Effect.Effect<void> =>
        Ref.update(connections, (conns) => {
          const newConns = new Set(conns);
          newConns.add(conn);
          return newConns;
        });

      /**
       * Remove a connection from the pool
       */
      const removeConnection = (conn: WebSocketConnection): Effect.Effect<void> =>
        Ref.update(connections, (conns) => {
          const newConns = new Set(conns);
          newConns.delete(conn);
          return newConns;
        });

      /**
       * Get the current connection count
       */
      const getConnectionCount = (): Effect.Effect<number> =>
        Effect.gen(function* () {
          const conns = yield* Ref.get(connections);
          return conns.size;
        });

      /**
       * Broadcast an event to all connected clients
       * Serializes the event and sends to each connection
       */
      const broadcast = (event: WsEvent): Effect.Effect<void> =>
        Effect.gen(function* () {
          const conns = yield* Ref.get(connections);

          // Serialize event to JSON
          const message = JSON.stringify(event);

          // Send to all connections (ignoring individual failures)
          yield* Effect.all(
            Array.from(conns).map((conn) =>
              conn.send(message).pipe(
                Effect.catchAll((error) =>
                  Effect.gen(function* () {
                    // Log error but don't fail the broadcast
                    yield* Effect.logWarning(
                      `Failed to send to connection ${conn.id}: ${String(error)}`,
                    );
                    // Remove failed connection from pool
                    yield* removeConnection(conn);
                  }),
                ),
              ),
            ),
            { concurrency: "unbounded" },
          );
        });

      return {
        addConnection,
        removeConnection,
        getConnectionCount,
        broadcast,
      } as const;
    }),
  );
}

/**
 * WebSocketService
 * Handles WebSocket connection lifecycle and authentication
 */
export class WebSocketService extends Context.Tag("WebSocketService")<
  WebSocketService,
  {
    readonly validateConnection: (token: string) => Effect.Effect<OktaClaims, UnauthorizedError>;
  }
>() {
  static readonly Default = Layer.effect(
    this,
    Effect.gen(function* () {
      const authService = yield* AuthService;

      /**
       * Validate JWT token for WebSocket connection
       * Returns user claims if valid, fails with UnauthorizedError otherwise
       */
      const validateConnection = (token: string): Effect.Effect<OktaClaims, UnauthorizedError> =>
        Effect.gen(function* () {
          if (!token || token.trim() === "") {
            return yield* Effect.fail(new UnauthorizedError({ message: "No token provided" }));
          }

          // Remove "Bearer " prefix if present
          const cleanToken = token.startsWith("Bearer ") ? token.substring(7) : token;

          // Validate via AuthService
          return yield* authService.validateToken(cleanToken);
        });

      return {
        validateConnection,
      } as const;
    }),
  );
}
