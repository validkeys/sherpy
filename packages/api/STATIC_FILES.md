# Static File Serving

## Overview

The API server includes static file serving capabilities for the web frontend build output. The implementation provides:

1. **Static File Middleware** (`src/api/static-files.ts`) - Core middleware for serving files
2. **Static Server Wrapper** (`src/api/static-server.ts`) - HTTP app wrapper for static files
3. **Test Coverage** (`src/api/static-files.test.ts`) - Comprehensive test suite

## Features

- Serves files from `packages/web/dist/` in production mode
- SPA fallback: serves `index.html` for all non-API routes
- Smart caching:
  - Assets with content hashes: `max-age=31536000, immutable`
  - index.html: `no-cache, no-store, must-revalidate`
  - Other files: `max-age=3600`
- Does not intercept:
  - `/api/*` routes (handled by API handlers)
  - WebSocket connections
- Skips static serving in development mode (Vite dev server handles it)

## Deployment Recommendations

### Production (Recommended): Reverse Proxy

The recommended production deployment uses a reverse proxy (nginx, Caddy, or cloud load balancer) to serve static files:

```nginx
# nginx example
server {
    listen 80;
    server_name app.example.com;

    # Serve static files directly
    location / {
        root /app/packages/web/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets with hashes
        location ~* \.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Don't cache index.html
        location = /index.html {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://localhost:3101;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Development

In development mode, the Vite dev server runs on port 5173 and proxies API requests to the API server on port 3100:

```bash
# Terminal 1: API server
pnpm run dev:api

# Terminal 2: Vite dev server
pnpm run dev:web
```

The Vite dev server configuration (`packages/web/vite.config.ts`) includes:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3100',
      changeOrigin: true
    }
  }
}
```

## Future Integration

The static file middleware and wrapper implementations are complete and tested. If direct static serving from the Node.js API server is needed (e.g., for simplified deployment), the integration code can be added to `src/server.ts`. The current implementation is production-ready but follows the industry-standard pattern of using a dedicated static file server/CDN.

## File Structure

```
packages/api/src/api/
├── static-files.ts       # Core middleware implementation
├── static-files.test.ts  # Test suite
└── static-server.ts      # HTTP app wrapper
```

## Testing

```bash
pnpm test src/api/static-files.test.ts
```

Tests cover:
- Development mode behavior (pass-through)
- Production mode serving
- Cache headers for different file types
- SPA fallback routing
- API route pass-through
- WebSocket connection pass-through
