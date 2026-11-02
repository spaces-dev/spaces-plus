import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${fileURLToPath(new URL('./src/', import.meta.url))}` },
      { find: 'virtual:vite-userscript-plugin', replacement: fileURLToPath(new URL('./src/test/userscript-plugin.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
})
