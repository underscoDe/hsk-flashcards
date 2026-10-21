import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/unit/**/*.test.js'],
    coverage: {
      // Pure logic modules; the DOM-driven ones (setup, flashcard, app…) are covered by e2e tests
      include: ['js/utils.js', 'js/progress.js', 'js/activity.js'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
