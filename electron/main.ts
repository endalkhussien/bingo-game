import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { initDatabase } from './services/database-service';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  await initDatabase();
  registerIpcHandlers();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Minch Bingo',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // dist-electron/electron/preload.js
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: false,
  });

  const menu = Menu.buildFromTemplate([
  { label: 'File', submenu: [{ role: 'quit' }] },
  { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
  { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
  { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
  { label: 'Help', submenu: [{ label: 'About Minch Bingo' }] },
  ]);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../.next/standalone/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
