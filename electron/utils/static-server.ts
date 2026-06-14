import http from 'http';
import path from 'path';
import fs from 'fs';
import { AddressInfo } from 'net';

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
};

export function startStaticServer(rootDir: string): Promise<{ url: string; close: () => void }> {
  const root = path.resolve(rootDir);

  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
      if (urlPath.endsWith('/')) urlPath += 'index.html';

      let filePath = path.join(root, urlPath);

      // Prevent path traversal
      if (!filePath.startsWith(root)) {
        res.writeHead(403); res.end(); return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        // SPA fallback → index.html for client-side routes
        filePath = path.join(root, 'index.html');
      }

      const ext = path.extname(filePath);
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
    server.on('error', reject);
  });
}
