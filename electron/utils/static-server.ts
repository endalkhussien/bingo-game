import http from 'http';
import path from 'path';
import fs from 'fs';
import { AddressInfo } from 'net';
import { app } from 'electron';

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
  const resolvedRoot = path.resolve(root);
  let normalized = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;

  // Fix broken relative ./_next requests from nested routes (e.g. /login/_next/...)
  const nestedNext = normalized.indexOf('_next/');
  if (nestedNext > 0) {
    normalized = normalized.slice(nestedNext);
  }

  let filePath = path.join(resolvedRoot, normalized);
  const resolvedFile = path.resolve(filePath);

  if (!resolvedFile.startsWith(resolvedRoot)) return null;

  if (fs.existsSync(resolvedFile)) {
    if (fs.statSync(resolvedFile).isDirectory()) {
      const indexHtml = path.join(resolvedFile, 'index.html');
      if (fs.existsSync(indexHtml)) return indexHtml;
    }
    return resolvedFile;
  }

  if (urlPath.endsWith('/')) {
    const indexHtml = path.join(resolvedFile, 'index.html');
    if (fs.existsSync(indexHtml)) return indexHtml;
  }

  const withHtml = path.join(resolvedFile, 'index.html');
  if (fs.existsSync(withHtml)) return withHtml;

  const spaFallback = path.join(resolvedRoot, 'index.html');
  return fs.existsSync(spaFallback) ? spaFallback : null;
}

function getStaticRoots(primaryRoot: string): string[] {
  const roots = [path.resolve(primaryRoot)];
  if (app.isPackaged) {
    roots.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'out'));
    const appPath = app.getAppPath();
    if (appPath.endsWith('.asar')) {
      roots.push(path.join(path.dirname(appPath), 'app.asar.unpacked', 'out'));
    }
  }
  return [...new Set(roots)];
}

function resolveFromRoots(roots: string[], urlPath: string): string | null {
  for (const root of roots) {
    const file = resolveFile(root, urlPath);
    if (file) return file;
  }
  return null;
}

export function startStaticServer(rootDir: string): Promise<{ url: string; close: () => void }> {
  const roots = getStaticRoots(rootDir);

  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
      const filePath = resolveFromRoots(roots, urlPath);

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
