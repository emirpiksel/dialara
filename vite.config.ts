// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: "127.0.0.1", // bu kritik!
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/log-call': 'http://127.0.0.1:8000',
    },
  },
  
});
