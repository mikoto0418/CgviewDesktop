import { vi } from 'vitest';

const mockFiles: Record<string, string> = {};

export const readFileSync = vi.fn((filePath: string, encoding: BufferEncoding) => {
  if (filePath in mockFiles) {
    return mockFiles[filePath];
  }
  throw new Error(`File not found: ${filePath}`);
});

export const writeFileSync = vi.fn(
  (filePath: string, content: string) => {
    mockFiles[filePath] = content;
  }
);

export const existsSync = vi.fn((filePath: string) => {
  return filePath in mockFiles;
});

export const mkdirSync = vi.fn();

export const rmSync = vi.fn();

export default {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync
};
