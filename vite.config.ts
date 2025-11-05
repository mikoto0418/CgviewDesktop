import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';

  const projectRoot = resolve(__dirname);

  const outDirRenderer = resolve(projectRoot, 'dist/renderer');
  const outDirMain = resolve(projectRoot, 'dist/main');
  const outDirPreload = resolve(projectRoot, 'dist/preload');

  return {
    root: 'src/renderer',
    plugins: [
      react(),
      electron({
        main: {
          entry: resolve(projectRoot, 'src/main/index.ts'),
          onstart({ startup }) {
            if (isDevelopment) {
              startup();
            }
          },
          vite: {
            resolve: {
              alias: {
                '@shared': resolve(projectRoot, 'src/shared'),
                '@main': resolve(projectRoot, 'src/main')
              }
            },
            build: {
              outDir: outDirMain,
              rollupOptions: {
                external: ['sql.js', 'electron']
              },
              emptyOutDir: true,
              sourcemap: isDevelopment ? 'inline' : false,
              watch: isDevelopment ? {} : undefined
            }
          }
        },
        preload: {
          entry: resolve(projectRoot, 'src/preload/index.ts'),
          vite: {
            resolve: {
              alias: {
                '@shared': resolve(projectRoot, 'src/shared')
              }
            },
            build: {
              outDir: outDirPreload,
              rollupOptions: {
                output: {
                  entryFileNames: 'bridge.js',
                  format: 'cjs'
                },
                external: ['electron', 'electron/renderer']
              },
              emptyOutDir: true,
              sourcemap: isDevelopment ? 'inline' : false,
              watch: isDevelopment ? {} : undefined
            },
            esbuild: {
              format: 'cjs'
            }
          }
        }
      })
    ],
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    build: {
      outDir: outDirRenderer,
      emptyOutDir: true
    },
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
