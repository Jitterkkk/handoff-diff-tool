import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'plugin') {
    return {
      build: {
        lib: {
          entry: resolve(__dirname, 'src/plugin/code.ts'),
          formats: ['iife'],
          name: 'pluginCode',
          fileName: () => 'code.js',
        },
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          external: [],
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  return {
    plugins: [react(), viteSingleFile()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
    },
  };
});
