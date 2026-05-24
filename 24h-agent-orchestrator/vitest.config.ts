import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/webui/src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/__tests__/**',
        'src/webui/e2e/**',
      ],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
