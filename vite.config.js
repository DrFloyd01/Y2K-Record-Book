import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pride_guys: resolve(__dirname, 'pride_guys.html'),
      },
      output: {
        manualChunks: {
          chartjs: ['chart.js', 'chart.js/auto'],
          lucide: ['lucide'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
