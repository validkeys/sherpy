import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

/**
 * Performance Budget Configuration
 *
 * Bundle size thresholds to prevent bundle bloat:
 * - Main bundle: 200KB gzipped max (warn at 150KB)
 * - Vendor bundle: 300KB gzipped max (warn at 250KB)
 * - Total initial load: 500KB gzipped max
 *
 * These limits help maintain fast initial page loads and good performance.
 * Run `pnpm run analyze` to visualize bundle composition when approaching limits.
 */
const PERFORMANCE_BUDGETS = {
  main: {
    warn: 150 * 1024, // 150KB
    error: 200 * 1024, // 200KB
  },
  vendor: {
    warn: 250 * 1024, // 250KB
    error: 300 * 1024, // 300KB
  },
  total: {
    warn: 450 * 1024, // 450KB
    error: 500 * 1024, // 500KB
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
  build: {
    // Enable detailed chunk size reporting
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500, // Warn if any chunk exceeds 500KB

    rollupOptions: {
      output: {
        // Manual chunking strategy for better code splitting
        manualChunks: (id) => {
          // Vendor chunk: all node_modules
          if (id.includes('node_modules')) {
            // Separate large libraries into their own chunks
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            if (id.includes('@assistant-ui')) {
              return 'vendor-assistant'
            }
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            // All other vendors
            return 'vendor'
          }
        },
      },
      // Performance budget plugin
      plugins: [
        {
          name: 'performance-budget',
          generateBundle(_options, bundle) {
            let totalSize = 0
            const warnings: string[] = []
            const errors: string[] = []

            // Check individual chunk sizes
            Object.values(bundle).forEach((chunk) => {
              if (chunk.type === 'chunk') {
                const size = chunk.code.length
                totalSize += size

                // Estimate gzipped size (roughly 1/4 to 1/3 of original)
                const gzipSize = Math.floor(size * 0.3)

                const chunkName = chunk.name || 'unknown'

                // Check main bundle
                if (chunkName === 'index') {
                  if (gzipSize > PERFORMANCE_BUDGETS.main.error) {
                    errors.push(
                      `Main bundle (${chunkName}) exceeds budget: ${(gzipSize / 1024).toFixed(2)}KB > ${(PERFORMANCE_BUDGETS.main.error / 1024).toFixed(2)}KB`
                    )
                  } else if (gzipSize > PERFORMANCE_BUDGETS.main.warn) {
                    warnings.push(
                      `Main bundle (${chunkName}) approaching budget: ${(gzipSize / 1024).toFixed(2)}KB (warn at ${(PERFORMANCE_BUDGETS.main.warn / 1024).toFixed(2)}KB)`
                    )
                  }
                }

                // Check vendor bundles
                if (chunkName.includes('vendor')) {
                  if (gzipSize > PERFORMANCE_BUDGETS.vendor.error) {
                    errors.push(
                      `Vendor bundle (${chunkName}) exceeds budget: ${(gzipSize / 1024).toFixed(2)}KB > ${(PERFORMANCE_BUDGETS.vendor.error / 1024).toFixed(2)}KB`
                    )
                  } else if (gzipSize > PERFORMANCE_BUDGETS.vendor.warn) {
                    warnings.push(
                      `Vendor bundle (${chunkName}) approaching budget: ${(gzipSize / 1024).toFixed(2)}KB (warn at ${(PERFORMANCE_BUDGETS.vendor.warn / 1024).toFixed(2)}KB)`
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

            // Output warnings
            if (warnings.length > 0) {
              console.warn('\n⚠️  Performance Budget Warnings:')
              warnings.forEach((warning) => console.warn(`  - ${warning}`))
            }

            // Output errors
            if (errors.length > 0) {
              console.error('\n❌ Performance Budget Errors:')
              errors.forEach((error) => console.error(`  - ${error}`))
              console.error('\nRun `pnpm run analyze` to investigate bundle composition.')
              // Fail the build if budgets are exceeded
              throw new Error('Performance budgets exceeded!')
            }

            // Success message
            if (warnings.length === 0 && errors.length === 0) {
              console.log('\n✅ All performance budgets met!')
              console.log(`   Total estimated gzipped size: ${(totalGzipSize / 1024).toFixed(2)}KB`)
            }
          },
        },
      ],
    },
  },
})
