import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

// Stamp dist/sw.js with a hash of everything else in dist/ so the service
// worker's bytes change whenever the app does (browsers only install a new
// SW when sw.js itself changes). Fails the build if the placeholder is gone.
function swBuildId(): Plugin {
  const outDir = resolve(__dirname, 'dist');
  const swPath = resolve(outDir, 'sw.js');
  const listFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? listFiles(resolve(dir, e.name)) : [resolve(dir, e.name)],
    );
  return {
    name: 'sw-build-id',
    apply: 'build',
    closeBundle() {
      const hash = createHash('sha256');
      for (const file of listFiles(outDir).filter((f) => f !== swPath).sort()) {
        hash.update(relative(outDir, file));
        hash.update(readFileSync(file));
      }
      const id = hash.digest('hex').slice(0, 12);
      const sw = readFileSync(swPath, 'utf8');
      if (!sw.includes('__BUILD_ID__')) {
        throw new Error('sw-build-id: __BUILD_ID__ placeholder not found in dist/sw.js');
      }
      writeFileSync(swPath, sw.replaceAll('__BUILD_ID__', id));
    },
  };
}

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
    swBuildId(),
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
