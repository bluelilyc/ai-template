import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        cli: resolve(__dirname, 'src/cli.ts'),
        index: resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'child_process',
        'commander',
        'fs',
        'fs/promises',
        'path',
        'process',
        'readline/promises',
        'url',
        'util',
      ],
    },
    target: 'node18',
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
