import { app, BrowserWindow, Menu, dialog } from 'electron';
import path from 'path';
import { initDatabase } from './services/database-service';
import { registerIpcHandlers } from './ipc/handlers';
import { startStaticServer } from './utils/static-server';

let mainWindow: BrowserWindow | null = null;
let closeStaticServer: (() => void) | null = null;

const isDev = process.env.NODE_ENV === 'development';
const openDevTools = process.env.ELECTRON_DEVTOOLS === '1';

async function loadUi(win: BrowserWindow) {
  if (isDev) {
    const devUrl = process.env.UI_URL ?? 'http://localhost:3000';
    await win.loadURL(devUrl);
    if (openDevTools) win.webContents.openDevTools();
    return;
  }

  const outDir = path.join(__dirname, '../../out');
  const { url, close } = await startStaticServer(outDir);
  closeStaticServer = close;
  await win.loadURL(url);
}

async function createWindow() {
  try {
    await initDatabase();
    registerIpcHandlers();
  } catch (err) {
    dialog.showErrorBox('Startup Error', `Database failed to initialize:\n${err}`);
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Minch Bingo',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    { label: 'View', submenu: [{ role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { label: 'Help', submenu: [{ label: 'Minch Bingo v1.0' }] },
  ]));

  try {
    await loadUi(mainWindow);
  } catch (err) {
    dialog.showErrorBox('Load Error', `Failed to load UI:\n${err}\n\nRun: npm run build`);
    app.quit();
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeStaticServer?.();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
