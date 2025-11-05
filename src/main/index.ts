import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPersistenceAdapter } from './persistence';
import { registerImportIpc } from './ipc/import-ipc';
import { registerProjectIpc } from './ipc/projects-ipc';
import { app, BrowserWindow, dialog, ipcMain } from './electron-module';

const isDevelopment = !app.isPackaged;
const __dirname = dirname(fileURLToPath(import.meta.url));
const persistence = getPersistenceAdapter();
const preloadPath = join(__dirname, '../preload/bridge.js');
console.info(
  '[main] using preload script at',
  preloadPath,
  'exists:',
  existsSync(preloadPath)
);

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#111827',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.once('dom-ready', () => {
    console.info('[main] renderer dom-ready', window.webContents.getURL());
  });

  window.once('ready-to-show', () => window.show());

  if (isDevelopment && process.env['VITE_DEV_SERVER_URL']) {
    await window.loadURL(process.env['VITE_DEV_SERVER_URL']);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = join(__dirname, '../renderer/index.html');
    await window.loadFile(indexHtml);
  }
};

ipcMain.handle('dialog:selectDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle(
  'dialog:selectFile',
  async (
    _event,
    filters?: Array<{ name: string; extensions: string[] }>
  ) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters && filters.length > 0 ? filters : undefined
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    return filePaths[0];
  }
);

app.whenReady().then(async () => {
  await persistence.init().catch((error) => {
    console.error('[Persistence] Failed to initialize database', error);
    throw error;
  });

  registerProjectIpc(persistence);
  registerImportIpc(persistence);

  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    persistence
      .close()
      .catch((error) =>
        console.error('[Persistence] Failed to close database', error)
      )
      .finally(() => {
        app.quit();
      });
  }
});

app.on('before-quit', () => {
  persistence
    .close()
    .catch((error) =>
      console.error('[Persistence] Failed to close database on quit', error)
    );
});
