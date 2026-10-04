import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Don't crash the dev server on backend connection errors
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error('[Proxy] Backend unreachable:', err.message);
            // Send a proper JSON error back to the browser instead of a raw crash
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'Backend server is not running. Start it with: cd backend && npm run dev',
                })
              );
            }
          });
        },
      },
    },
  },
});
