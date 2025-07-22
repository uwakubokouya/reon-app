import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src',  // ここでrootをsrcに指定
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [react()],
});
