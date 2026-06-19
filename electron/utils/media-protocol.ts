import { protocol, app } from 'electron';
import fs from 'fs';
import path from 'path';

function getMediaRoots(): string[] {
  const roots: string[] = [];
  const appPath = app.getAppPath();
  roots.push(path.join(appPath, 'out'));

  if (app.isPackaged) {
    roots.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'out'));
    if (appPath.endsWith('.asar')) {
      roots.push(path.join(path.dirname(appPath), 'app.asar.unpacked', 'out'));
    }
  } else {
    roots.push(path.join(process.cwd(), 'out'));
    roots.push(path.join(process.cwd(), 'public'));
  }

  return [...new Set(roots.map((r) => path.resolve(r)))];
}

function resolveMediaFile(relative: string): string | null {
  const normalized = relative.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);

  for (const root of getMediaRoots()) {
    const candidate = path.resolve(root, ...parts);
    if (!candidate.startsWith(root)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

export function registerWaliyaMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'waliya-media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function registerWaliyaMediaProtocol(): void {
  protocol.registerFileProtocol('waliya-media', (request, callback) => {
    try {
      const relative = decodeURIComponent(request.url.replace(/^waliya-media:\/\//i, ''));
      const filePath = resolveMediaFile(relative);
      if (!filePath) {
        callback({ error: -6 });
        return;
      }
      callback({ path: filePath });
    } catch {
      callback({ error: -2 });
    }
  });
}
