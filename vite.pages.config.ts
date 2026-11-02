import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve('github-pages'),
  base: '/scadademo_261102/',
  publicDir: path.resolve('public'),
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: {
      '@': path.resolve('.'),
      'next/image': path.resolve('github-pages/next-image.tsx'),
    },
  },
  build: {
    outDir: path.resolve('pages-dist'),
    emptyOutDir: true,
  },
});
