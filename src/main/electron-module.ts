import { createRequire } from 'node:module';

type ElectronMainModule = typeof import('electron');

const require = createRequire(import.meta.url);

// 在开发模式下，electron 应该通过 vite-plugin-electron 提供
// 这里直接导入 electron，如果失败则抛出友好错误
let electron: ElectronMainModule | null = null;

try {
  electron = require('electron');
  // 验证是否成功加载
  if (!electron || typeof electron !== 'object' || !('app' in electron)) {
    throw new Error('Invalid electron module');
  }
} catch (error) {
  // 如果是开发模式且 electron 不可用，这通常是正常的
  // vite-plugin-electron 会在后续启动 electron
  if (process.env.VITE_DEV_SERVER_URL) {
    console.warn(
      '[electron-module] Electron not yet available, will be provided by vite-plugin-electron'
    );
    // 在开发模式下设置为空对象，让应用可以继续
    electron = {} as ElectronMainModule;
  } else {
    const message =
      '[main] Electron runtime APIs are unavailable. ' +
      '请确保通过 Electron 可执行文件启动应用（例如运行 `npm run dev` 或 `npx electron .`），' +
      '并确认未将环境变量 ELECTRON_RUN_AS_NODE 设置为 1。';
    console.error(message);
    throw new Error(message);
  }
}

// 提供默认的 mock 对象，避免在 electron 加载前出错
const createMockWindow = () => ({
  webContents: {
    once: () => {},
    on: () => {},
    getURL: () => 'http://localhost:5173/',
    openDevTools: () => {},
    executeJavaScript: () => Promise.resolve({ hasRoot: false, bodyInnerHTML: '' })
  },
  once: () => {},
  show: () => {},
  loadURL: () => Promise.resolve(),
  loadFile: () => Promise.resolve(),
  focus: () => {},
  setAlwaysOnTop: () => {}
});

const mockElectron = {
  app: {
    isPackaged: false,
    whenReady: () => Promise.resolve(),
    on: () => {},
    quit: () => {},
    getPath: () => ''
  },
  BrowserWindow: function() {
    return createMockWindow();
  },
  dialog: {
    showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] })
  },
  ipcMain: {
    handle: () => {},
    on: () => {}
  }
};

const hasElectronRuntime = (
  module: ElectronMainModule | null
): module is ElectronMainModule =>
  !!module && typeof module === 'object' && 'app' in module;

// 只有在 electron 成功加载时才使用真实对象
const electronAPI = hasElectronRuntime(electron) ? electron : mockElectron;

export const { app, BrowserWindow, dialog, ipcMain } = electronAPI;
export type ElectronMain = ElectronMainModule;
