import { BrowserWindow } from 'electron';
import path from 'path';
import { APP_NAME } from '../../src/shared/brand';
import { resolveAppIconPath } from './app-icon';

let callerDisplayWindow: BrowserWindow | null = null;

async function resolveUiBase(win: BrowserWindow): Promise<string> {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    let devUrl = process.env.UI_URL ?? 'http://127.0.0.1:3000';
    try {
      const fs = require('fs');
      const portPath = path.join(__dirname, '../../.dev-port');
      if (!process.env.UI_URL && fs.existsSync(portPath)) {
        const content = fs.readFileSync(portPath, 'utf8').trim();
        devUrl = content.startsWith('http') ? content : `http://127.0.0.1:${content}`;
      }
    } catch { /* use default */ }
    return devUrl.replace(/\/$/, '');
  }

  const current = win.webContents.getURL();
  if (current && current.startsWith('http')) {
    try {
      return new URL(current).origin;
    } catch { /* fall through */ }
  }
  return 'http://127.0.0.1:4173';
}

export function closeCallerDisplayWindow(): void {
  if (callerDisplayWindow && !callerDisplayWindow.isDestroyed()) {
    callerDisplayWindow.close();
  }
  callerDisplayWindow = null;
}

export async function openCallerDisplayWindow(parent: BrowserWindow | null): Promise<boolean> {
  if (callerDisplayWindow && !callerDisplayWindow.isDestroyed()) {
    callerDisplayWindow.focus();
    return true;
  }

  const base = parent ? await resolveUiBase(parent) : (process.env.UI_URL ?? 'http://127.0.0.1:3000');
  const url = `${base.replace(/\/$/, '')}/agent/caller-display/`;

  const iconPath = resolveAppIconPath();

  callerDisplayWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: `${APP_NAME} — Caller Display`,
    backgroundColor: '#1a1f3a',
    autoHideMenuBar: true,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  callerDisplayWindow.on('closed', () => {
    callerDisplayWindow = null;
  });

  await callerDisplayWindow.loadURL(url);
  return true;
}

export function isCallerDisplayOpen(): boolean {
  return !!callerDisplayWindow && !callerDisplayWindow.isDestroyed();
}
