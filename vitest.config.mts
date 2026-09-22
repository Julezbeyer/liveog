import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'packages/core/src/**/*.test.ts',
            'packages/renderer/src/**/*.test.ts',
            'packages/cli/src/**/*.test.ts',
            'apps/meta/src/**/*.test.ts',
            // Pure mapping logic, so it belongs with the node tests rather than
            // the jsdom ones even though it ships in the web app.
            'apps/web/src/lib/site-import.test.ts',
          ],
        },
      },
      {
        // React components need a DOM for effects and window event listeners.
        test: {
          name: 'react',
          environment: 'jsdom',
          include: ['packages/react/src/**/*.test.tsx'],
        },
      },
    ],
  },
})
