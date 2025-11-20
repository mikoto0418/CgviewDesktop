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

  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelLabel = ['log', 'warning', 'error'][level] ?? 'log';
    console[level === 2 ? 'error' : level === 1 ? 'warn' : 'info'](
      `[renderer:${levelLabel}] ${message} (${sourceId}:${line})`
    );
  });

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(
      '[main] renderer load failed',
      { errorCode, errorDescription, validatedURL }
    );
  });

  window.webContents.on('did-finish-load', () => {
    console.info('[main] renderer finished loading');
    window.webContents
      .executeJavaScript(
        "({ hasRoot: !!document.getElementById('root'), bodyInnerHTML: document.body.innerHTML.slice(0, 200) })"
      )
      .then(info => {
        console.info('[main] renderer DOM snapshot', info);
      })
      .catch(error => {
        console.error('[main] Failed to inspect renderer DOM', error);
      });
  });

  window.once('ready-to-show', async () => {
    console.info('[main] Window ready to show, displaying...');
    window.show();
    // 强制激活窗口并设置焦点
    await new Promise(resolve => setTimeout(resolve, 100));
    window.focus();
    console.info('[main] Window focused');
  });

  window.once('show', () => {
    console.info('[main] Window shown successfully');
  });

  if (isDevelopment && process.env['VITE_DEV_SERVER_URL']) {
    console.info('[main] Loading development URL:', process.env['VITE_DEV_SERVER_URL']);
    await window.loadURL(process.env['VITE_DEV_SERVER_URL']);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = join(__dirname, '../renderer/index.html');
    console.info('[main] Loading production HTML:', indexHtml);
    await window.loadFile(indexHtml);
  }

  // 确保窗口在前面并获得焦点
  console.info('[main] Activating and focusing window...');
  if (typeof window.setAlwaysOnTop === 'function') {
    // 短暂开启置顶实现“提到最前”效果，随后立即恢复
    window.setAlwaysOnTop(true);
    window.setAlwaysOnTop(false);
  }
  window.focus();
  console.info('[main] Window activation complete');
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
  console.info('[main] Electron app is ready, initializing...');

  try {
    console.info('[main] Initializing persistence adapter...');
    await persistence.init();
    console.info('[main] Persistence adapter initialized successfully');
  } catch (error) {
    console.error('[Persistence] Failed to initialize database', error);
    console.warn('[main] Continuing without database, app will run in limited mode');
  }

  console.info('[main] Registering IPC handlers...');
  registerProjectIpc(persistence);
  registerImportIpc(persistence);
  console.info('[main] IPC handlers registered');

  console.info('[main] Creating main window...');
  await createWindow();
  console.info('[main] Main window created');

  app.on('activate', async () => {
    console.info('[main] App activated, creating window if needed...');
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
