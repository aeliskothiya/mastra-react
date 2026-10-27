import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'

const mastraDataGlobs = [
  '**/*.db',
  '**/*.db-*',
  '**/*.duckdb',
  '**/*.duckdb.*',
  '**/mastra.duckdb*',
  '**/src/mastra/public/**',
  '**/.mastra/**',
]

function ignoreMastraDataFiles(): Plugin {
  return {
    name: 'ignore-mastra-data-files',
    configureServer(server) {
      server.watcher.unwatch(mastraDataGlobs)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ignoreMastraDataFiles()],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },

  server: {
    proxy: {
      '/chat': {
        target: 'http://127.0.0.1:4111',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: mastraDataGlobs,
    },
  },
})