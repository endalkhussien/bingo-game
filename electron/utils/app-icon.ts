import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/** Resolve Waliya taskbar / window icon in dev and packaged builds. */
export function resolveAppIconPath(): string | undefined {
  const isWin = process.platform === 'win32';
  const names = isWin ? ['icon.ico', 'icon.png'] : ['icon.png', 'icon.ico'];

  const bases = [
    path.join(process.resourcesPath, 'brand'),
    path.join(app.getAppPath(), 'out', 'brand'),
    path.join(app.getAppPath(), 'public', 'brand'),
    path.join(__dirname, '../../public/brand'),
    path.join(__dirname, '../../../public/brand'),
  ];

  for (const base of bases) {
    for (const name of names) {
      const candidate = path.join(base, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return undefined;
}
