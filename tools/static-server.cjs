const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.STREETKILLAZ_WEB_PORT || 8080);
// The game client is hosted locally; the VPS is the separate WebSocket target.
// Binding the local file server to the VPS public IP fails on normal player PCs.
const host = process.env.STREETKILLAZ_WEB_HOST || '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath === '/' ? '/index.html' : requestPath);
  const resolved = path.resolve(root, `.${decoded}`);
  return resolved.startsWith(root) ? resolved : null;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  const filePath = safePath(url.pathname);

  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end('Forbidden');
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Not found');
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`[StreetKillaz] Local web server is already running at http://${host}:${port}`);
    process.exit(0);
  }
  console.error('[StreetKillaz] Local web server failed:', error);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log('==================================================');
  console.log('       StreetKillaz Local Game Web Server');
  console.log('==================================================');
  console.log(`Game URL: http://${host}:${port}`);
  console.log('Official VPS: ws://147.189.172.104:7076');
  console.log('Connection check: the game will authenticate against the official VPS automatically.');
  console.log('Keep this window open while playing.');
});
