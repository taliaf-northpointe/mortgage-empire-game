/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base matches the GitHub Pages project path:
// https://taliaf-northpointe.github.io/mortgage-tycoon/
export default defineConfig({
  base: '/mortgage-tycoon/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
