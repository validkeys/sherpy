/**
 * Static file server wrapper
 * Wraps the HTTP API server to serve static files first
 */

import { HttpApp, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { FileSystem } from "@effect/platform"
import { fileURLToPath } from "node:url"
import { dirname, join, extname } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Get MIME type from file extension
 */
const getMimeType = (ext: string): string => {
  const mimeTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
  }
  return mimeTypes[ext] || "application/octet-stream"
}

/**
 * Get Cache-Control header for a file
 */
const getCacheControl = (path: string): string => {
  // Assets with content hashes can be cached forever
  if (/\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf)$/i.test(path)) {
    return "public, max-age=31536000, immutable"
  }
  // index.html should not be cached
  if (path.endsWith("index.html") || path === "/") {
    return "no-cache, no-store, must-revalidate"
  }
  // Other files get short cache
  return "public, max-age=3600"
}

/**
 * Wrap an HTTP app to serve static files first
 *
 * @param apiApp - The API HTTP app to wrap
 * @param distPath - Relative path to the dist directory
 */
export const wrapWithStaticFiles = <E, R>(
  apiApp: HttpApp.Default<E, R>,
  distPath: string
): HttpApp.Default<E, R | FileSystem.FileSystem> => {
  // Skip in development mode
  if (process.env.NODE_ENV === "development") {
    return apiApp
  }

  const distDir = join(__dirname, distPath)

  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const request = yield* HttpServerRequest.HttpServerRequest

    const url = new URL(request.url, "http://localhost")
    let requestPath = url.pathname

    // Don't intercept API routes or WebSocket paths
    if (requestPath.startsWith("/api") || requestPath === "/ws") {
      return yield* apiApp
    }

    // Map paths to file system
    let filePath = join(distDir, requestPath)

    // Check if file exists
    const fileExists = yield* fs.exists(filePath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    )

    // SPA fallback: serve index.html for non-existent routes
    if (!fileExists || requestPath === "/") {
      filePath = join(distDir, "index.html")
      requestPath = "/index.html"

      // Check if index.html exists, if not pass through to API
      const indexExists = yield* fs.exists(filePath).pipe(
        Effect.catchAll(() => Effect.succeed(false))
      )

      if (!indexExists) {
        return yield* apiApp
      }
    }

    // Read file
    const readResult = yield* Effect.either(fs.readFile(filePath))

    if (readResult._tag === "Left") {
      // File read failed, pass through to API handler
      return yield* apiApp
    }

    const content = readResult.right

    // Set response headers
    const ext = extname(filePath)
    const mimeType = getMimeType(ext)
    const cacheControl = getCacheControl(requestPath)

    // Convert Uint8Array to string for text content
    const decoder = new TextDecoder("utf-8")
    const textContent = decoder.decode(content)

    return yield* HttpServerResponse.text(textContent, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": cacheControl,
      },
    })
  })
}
