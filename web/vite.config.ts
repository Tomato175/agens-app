import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the static build works on any host,
  // including GitHub Pages (https://<user>.github.io/<repo>/).
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      // Relative PPT download links resolve to the local backend in dev
      '/pptx': 'http://localhost:3000',
    },
  },
});