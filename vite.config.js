import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src',  // ここでsrcをrootに指定
  build: {
    outDir: '../dist', // ビルド成果物の出力先
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],  // electronを外部依存にする
    },
  },
  plugins: [react()]
});
