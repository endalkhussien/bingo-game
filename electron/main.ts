import { app, BrowserWindow, Menu, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './services/database-service';
import { registerIpcHandlers } from './ipc/handlers';
import { closeCallerDisplayWindow } from './utils/caller-display-window';
import { startStaticServer } from './utils/static-server';
import { checkWindowsSupport } from './utils/windows-support';
import { formatStartupError } from './utils/startup-error';
import { APP_NAME } from '../src/shared/brand';

let mainWindow: BrowserWindow | null = null;
let closeStaticServer: (() => void) | null = null;

const isDev = process.env.NODE_ENV === 'development';
const openDevTools = process.env.ELECTRON_DEVTOOLS === '1';

async function loadUi(win: BrowserWindow) {
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
    await win.loadURL(devUrl);
    if (openDevTools) win.webContents.openDevTools();
    return;
  }

  // Next.js static export needs http:// for /login/index.txt and client routes (file:// breaks paths)
  const outDir = path.join(app.getAppPath(), 'out');
  const { url, close } = await startStaticServer(outDir);
  closeStaticServer = close;
  await win.loadURL(`${url}login/`);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    show: true,
    backgroundColor: '#f9fafb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      // Ball-call audio runs from async game loop — must not require a fresh click each ball.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    { label: 'View', submenu: [{ role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { label: 'Help', submenu: [{ label: `${APP_NAME} v1.0` }] },
  ]));

  const uiReady = loadUi(mainWindow).catch((err) => {
    const outDir = path.join(app.getAppPath(), 'out');
    const outExists = fs.existsSync(path.join(outDir, 'index.html'));
    dialog.showErrorBox(
      'Load Error',
      [
        'Failed to load Waliya UI.',
        formatStartupError(err),
        '',
        `UI folder: ${outDir}`,
        outExists ? 'index.html was found — retry reinstalling Waliya.' : 'index.html is MISSING — rebuild with: npm run pack:win',
      ].join('\n'),
    );
    app.quit();
  });

  try {
    await initDatabase();
    registerIpcHandlers();
    await uiReady;
  } catch (err) {
    dialog.showErrorBox('Startup Error', formatStartupError(err));
    app.quit();
    return;
  }

  mainWindow.on('closed', () => {
    closeCallerDisplayWindow();
    mainWindow = null;
  });
}

const windowsSupport = checkWindowsSupport();
if (!windowsSupport.supported) {
  app.whenReady().then(() => {
    dialog.showErrorBox(
      'Unsupported Windows',
      windowsSupport.reason ?? 'This version of Windows is not supported.',
    );
    app.quit();
  });
} else {
  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  closeStaticServer?.();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
