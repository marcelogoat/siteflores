import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { geoResponse } from './src/server/geo';

async function geoMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (req.url !== '/' && req.url !== '') return next();
  if (req.method !== 'GET') {
    res.writeHead(405, { Allow: 'GET' }).end();
    return;
  }
  const remote = req.socket.remoteAddress;
  const ip = remote === '::1' || remote === '127.0.0.1' ? null : remote;
  const response = await geoResponse({ ip });
  res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' });
  res.end(await response.text());
}

const geoPlugin = {
  name: 'local-geo-endpoint',
  configureServer(server: { middlewares: { use: (route: string, handler: typeof geoMiddleware) => void } }) {
    server.middlewares.use('/api/geo', geoMiddleware);
  },
  configurePreviewServer(server: { middlewares: { use: (route: string, handler: typeof geoMiddleware) => void } }) {
    server.middlewares.use('/api/geo', geoMiddleware);
  },
};

export default defineConfig({
  plugins: [react(), geoPlugin],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
});
