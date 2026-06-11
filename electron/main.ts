import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { initDatabase } from './services/database-service';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function getUiPath(): string {
  if (isDev) {
    return 'http://localhost:3000';
  }
  // Static Next.js export → out/index.html
  return path.join(__dirname, '../../out/index.html');
}

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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: false,
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const menu = Menu.buildFromTemplate([
    { label: 'File', submenu: [{ role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    { label: 'Help', submenu: [{ label: 'About Minch Bingo' }] },
  ]);
  Menu.setApplicationMenu(menu);

  const uiPath = getUiPath();
  if (isDev) {
    await mainWindow.loadURL(uiPath);
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(uiPath);
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
