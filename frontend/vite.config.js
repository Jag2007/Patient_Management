// Vite config. In development, "/api" requests are forwarded to the Express backend,
// so the browser only ever talks to one origin and no API keys are needed in the frontend.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5050' },
  },
});
