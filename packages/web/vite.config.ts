import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

/**
 * Performance Budget Configuration (M0-019)
 *
 * Bundle size thresholds aligned with performance-budgets.md:
 * - Main bundle: 250KB gzipped max (warn at 200KB)
 * - Vendor chunks: 100KB gzipped max per chunk (warn at 80KB)
 * - Total initial load: 500KB gzipped max (warn at 450KB)
 *
 * These limits ensure fast initial page loads on 3G networks (~750KB/s).
 * Run `pnpm run analyze` to visualize bundle composition.
 *
 * See: docs/planning/artifacts/performance-budgets.md
 */
const PERFORMANCE_BUDGETS = {
  main: {
    warn: 200 * 1024, // 200KB gzipped
    error: 250 * 1024, // 250KB gzipped
  },
  chunk: {
    warn: 80 * 1024, // 80KB gzipped
    error: 100 * 1024, // 100KB gzipped
  },
  total: {
    warn: 450 * 1024, // 450KB gzipped
    error: 500 * 1024, // 500KB gzipped
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Generate gzipped versions of assets for size analysis
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false,
    }),
    // Bundle visualization - generates stats.html after build
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // Options: treemap, sunburst, network
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3101',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable detailed chunk size reporting
    reportCompressedSize: true,
    chunkSizeWarningLimit: 100, // Warn if any chunk exceeds 100KB (per M0-019 budgets)

    rollupOptions: {
      output: {
        // Manual chunking strategy optimized for 100KB per chunk budget
        manualChunks: (id) => {
          // Vendor chunk: all node_modules
          if (id.includes('node_modules')) {
            // Separate large libraries into their own chunks for better caching
            // React core (~80KB gzipped together)
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'vendor-react'
            }
            // React Router (~40KB gzipped)
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            // React Query (~50KB gzipped)
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            // Assistant UI (varies, keep separate for lazy loading)
            if (id.includes('@assistant-ui')) {
              return 'vendor-assistant'
            }
            // Jotai + Bunshi (small, ~10KB total)
            if (id.includes('jotai') || id.includes('bunshi')) {
              return 'vendor-state'
            }
            // UI libraries (Radix, Lucide, etc.)
            if (
              id.includes('@radix-ui') ||
              id.includes('lucide-react') ||
              id.includes('class-variance-authority') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')
            ) {
              return 'vendor-ui'
            }
            // All other vendors
            return 'vendor'
          }
        },
      },
      // Tree-shaking optimization
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
      },
      // Performance budget plugin (M0-019)
      plugins: [
        {
          name: 'performance-budget',
          generateBundle(_options, bundle) {
            let totalSize = 0
            const warnings: string[] = []
            const errors: string[] = []
            const chunkSizes: Array<{ name: string; size: number }> = []

            // Check individual chunk sizes
            Object.values(bundle).forEach((chunk) => {
              if (chunk.type === 'chunk') {
                const size = chunk.code.length
                totalSize += size

                // Estimate gzipped size (roughly 1/4 to 1/3 of original)
                const gzipSize = Math.floor(size * 0.3)
                const chunkName = chunk.name || 'unknown'

                chunkSizes.push({ name: chunkName, size: gzipSize })

                // Check main bundle (index.js)
                if (chunkName === 'index') {
                  if (gzipSize > PERFORMANCE_BUDGETS.main.error) {
                    errors.push(
                      `Main bundle exceeds budget: ${(gzipSize / 1024).toFixed(2)}KB > ${(PERFORMANCE_BUDGETS.main.error / 1024).toFixed(2)}KB`
                    )
                  } else if (gzipSize > PERFORMANCE_BUDGETS.main.warn) {
                    warnings.push(
                      `Main bundle approaching budget: ${(gzipSize / 1024).toFixed(2)}KB (warn at ${(PERFORMANCE_BUDGETS.main.warn / 1024).toFixed(2)}KB)`
                    )
                  }
                }

                // Check vendor and other chunks against chunk budget
                if (chunkName !== 'index') {
                  if (gzipSize > PERFORMANCE_BUDGETS.chunk.error) {
                    errors.push(
                      `Chunk "${chunkName}" exceeds budget: ${(gzipSize / 1024).toFixed(2)}KB > ${(PERFORMANCE_BUDGETS.chunk.error / 1024).toFixed(2)}KB`
                    )
                  } else if (gzipSize > PERFORMANCE_BUDGETS.chunk.warn) {
                    warnings.push(
                      `Chunk "${chunkName}" approaching budget: ${(gzipSize / 1024).toFixed(2)}KB (warn at ${(PERFORMANCE_BUDGETS.chunk.warn / 1024).toFixed(2)}KB)`
                    )
                  }
                }
              }
            })

            // Check total size
            const totalGzipSize = Math.floor(totalSize * 0.3)
            if (totalGzipSize > PERFORMANCE_BUDGETS.total.error) {
              errors.push(
                `Total bundle size exceeds budget: ${(totalGzipSize / 1024).toFixed(2)}KB > ${(PERFORMANCE_BUDGETS.total.error / 1024).toFixed(2)}KB`
              )
            } else if (totalGzipSize > PERFORMANCE_BUDGETS.total.warn) {
              warnings.push(
                `Total bundle size approaching budget: ${(totalGzipSize / 1024).toFixed(2)}KB (warn at ${(PERFORMANCE_BUDGETS.total.warn / 1024).toFixed(2)}KB)`
              )
            }

            // Output chunk size summary (always show in CI or when there are issues)
            const shouldShowDetails = process.env.CI || warnings.length > 0 || errors.length > 0
            if (shouldShowDetails) {
              console.log('\n📦 Bundle Sizes (estimated gzipped):')
              chunkSizes
                .sort((a, b) => b.size - a.size)
                .forEach(({ name, size }) => {
                  const sizeKB = (size / 1024).toFixed(2)
                  const budget = name === 'index'
                    ? PERFORMANCE_BUDGETS.main.error
                    : PERFORMANCE_BUDGETS.chunk.error
                  const utilization = Math.round((size / budget) * 100)
                  console.log(`   ${name.padEnd(20)} ${sizeKB.padStart(8)}KB  (${utilization}% of budget)`)
                })
              console.log(`   ${'TOTAL'.padEnd(20)} ${(totalGzipSize / 1024).toFixed(2).padStart(8)}KB`)
            }

            // Output warnings
            if (warnings.length > 0) {
              console.warn('\n⚠️  Performance Budget Warnings:')
              warnings.forEach((warning) => console.warn(`  - ${warning}`))
            }

            // Output errors
            if (errors.length > 0) {
              console.error('\n❌ Performance Budget Errors:')
              errors.forEach((error) => console.error(`  - ${error}`))
              console.error('\nActions:')
              console.error('  1. Run `pnpm run analyze` to visualize bundle composition')
              console.error('  2. Review docs/planning/artifacts/performance-budgets.md')
              console.error('  3. Consider lazy loading features or splitting large vendors')
              // Fail the build if budgets are exceeded
              throw new Error('Performance budgets exceeded!')
            }

            // Success message
            if (warnings.length === 0 && errors.length === 0) {
              console.log('\n✅ All performance budgets met!')
              console.log(`   Total: ${(totalGzipSize / 1024).toFixed(2)}KB / ${(PERFORMANCE_BUDGETS.total.error / 1024).toFixed(2)}KB (${Math.round((totalGzipSize / PERFORMANCE_BUDGETS.total.error) * 100)}% utilized)`)
            }
          },
        },
      ],
    },
  },
})
