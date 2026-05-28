import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';

// BrewRig builds a single inlined HTML for the SPA. credits.html is
// served as a static file from public/ (it does not need JS bundling).
//
// The PWA manifest lives at the project root (next to index.html), not
// under public/. This lets Vite track it via the `<link rel="manifest">`
// reference and emit a single copy to dist/. The custom `assetFileNames`
// below carves out manifest.json so it lands at dist/manifest.json (root)
// instead of dist/assets/manifest.json — keeping it aligned with both the
// service worker's cache list and the relative paths inside the manifest
// itself (icons, start_url).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    viteSingleFile({
      removeViteModuleLoader: false,
      useRecommendedBuildConfig: false,
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        assetFileNames: (info) =>
          info.name === 'manifest.json'
            ? '[name][extname]'
            : 'assets/[name][extname]',
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});
