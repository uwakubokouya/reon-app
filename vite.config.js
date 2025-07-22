import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src',
  base: './', // ここを追加
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [react()],
});
