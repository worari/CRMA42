import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react({
      include: /\.[jt]sx?$/,
    }),
  ],
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  esbuild: {
    jsx: 'automatic',
    include: /.*\.[jt]sx?$/,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setupTests.js'],
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
