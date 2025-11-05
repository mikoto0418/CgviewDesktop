import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { createSQLiteAdapter, SQLitePersistenceAdapter } from './sqlite-adapter';
import type { PersistenceAdapter } from './persistence-adapter';
import { app } from '../electron-module';

const resolveDatabasePath = (): string => {
  const customPath = process.env['CGVIEW_DB_PATH'];
  if (customPath) {
    return customPath;
  }

  if (app?.isPackaged) {
    const userData = app.getPath('userData');
    const storageDir = join(userData, 'storage');
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true });
    }
    return join(storageDir, 'cgview.db');
  }

  const projectDir = join(process.cwd(), 'data');
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }
  return join(projectDir, 'cgview.dev.db');
};

let adapterInstance: SQLitePersistenceAdapter | null = null;

export const getPersistenceAdapter = (): PersistenceAdapter => {
  if (adapterInstance) {
    return adapterInstance;
  }

  const databasePath = resolveDatabasePath();
  adapterInstance = createSQLiteAdapter(databasePath);
  return adapterInstance;
};
