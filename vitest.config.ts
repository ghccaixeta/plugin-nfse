import { defineConfig } from 'vitest/config';

// Ambiente padrão `node`; testes de DOM declaram `// @vitest-environment jsdom`.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
