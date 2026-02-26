import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        root: './server',
        include: ['tests/**/*.test.ts'],
        testTimeout: 10000,
    },
});
