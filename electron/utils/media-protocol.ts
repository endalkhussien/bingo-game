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

/** Resolve a media file from paths like audio/B1.mp3 or sounds/cartella/1.mp3 */
export function resolveMediaFile(relative: string): string | null {
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

/** First existing file from an ordered list of relative paths. */
export function resolveFirstMediaFile(relativePaths: string[]): string | null {
  for (const rel of relativePaths) {
    const found = resolveMediaFile(rel);
    if (found) return found;
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

function extractMediaRelativePath(url: string): string {
  const stripped = url.replace(/^waliya-media:\/\//i, '');
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'waliya-media:') {
      const host = parsed.hostname;
      const pathPart = parsed.pathname.replace(/^\/+/, '');
      if (host && host !== 'localhost') {
        return pathPart ? `${host}/${pathPart}` : host;
      }
      return pathPart;
    }
  } catch {
    // fall through
  }
  return stripped.replace(/^\/+/, '');
}

export function registerWaliyaMediaProtocol(): void {
  protocol.registerFileProtocol('waliya-media', (request, callback) => {
    try {
      const relative = decodeURIComponent(extractMediaRelativePath(request.url));
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
