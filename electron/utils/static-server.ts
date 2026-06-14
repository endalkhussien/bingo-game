import http from 'http';
import path from 'path';
import fs from 'fs';
import { AddressInfo } from 'net';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
};

function resolveFile(root: string, urlPath: string): string | null {
  const normalized = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  let filePath = path.join(root, normalized);

  if (!filePath.startsWith(root)) return null;

  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      const indexHtml = path.join(filePath, 'index.html');
      if (fs.existsSync(indexHtml)) return indexHtml;
    }
    return filePath;
  }

  if (urlPath.endsWith('/')) {
    const indexHtml = path.join(filePath, 'index.html');
    if (fs.existsSync(indexHtml)) return indexHtml;
  }

  const withHtml = path.join(filePath, 'index.html');
  if (fs.existsSync(withHtml)) return withHtml;

  const spaFallback = path.join(root, 'index.html');
  return fs.existsSync(spaFallback) ? spaFallback : null;
}

export function startStaticServer(rootDir: string): Promise<{ url: string; close: () => void }> {
  const root = path.resolve(rootDir);

  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
      const filePath = resolveFile(root, urlPath);

      if (!filePath) {
        res.writeHead(403);
        res.end();
        return;
      }

      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => server.close(),
      });
    });
    server.on('error', reject);
  });
}
