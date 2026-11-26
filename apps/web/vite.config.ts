import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig, loadEnv } from 'vite';

// Workspace packages are read from source (`@setubandh/source`), as in the API and tests.
const resolve = { conditions: ['@setubandh/source', ...defaultClientConditions] };

export default defineConfig(({ mode }) => {
  // In development the API runs on API_URL; proxy /v1 and /health so the refresh cookie is
  // first-party and no CORS is involved. Production builds call VITE_API_URL directly.
  const env = loadEnv(mode, '../..', '');
  const api = env.API_URL || 'http://localhost:3000';
  return {
    plugins: [react(), tailwindcss()],
    resolve,
    server: {
      proxy: { '/v1': api, '/health': api },
      headers: { 'Referrer-Policy': 'no-referrer' },
    },
    preview: { headers: { 'Referrer-Policy': 'no-referrer' } },
  };
});
