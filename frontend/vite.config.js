// Vite config. In development, "/api" requests are forwarded to the Express backend,
// so the browser only ever talks to one origin and no API keys are needed in the frontend.
// In the build, React gets its own file, so the browser caches it once and only re-downloads our small app files
// after a change. Ant Design is left to split per page (measured: the login page then needs 287 KB of JS instead of 422 KB).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5050' },
  },
});
