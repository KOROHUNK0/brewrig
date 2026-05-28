import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Post-build fix for the PWA manifest path.
//
// viteSingleFile rewrites `<link rel="manifest" href="./manifest.json">` to
// `./assets/manifest.json` and emits a duplicate file there. `public/sw.js`
// caches `./manifest.json` (the copy public/ produces at the dist root), so
// without this fix the browser requests `./assets/manifest.json` while the
// service worker has cached `./manifest.json` — offline PWA installs lose
// the manifest. Restore the original href and drop the duplicate file.
function fixManifestPath(): Plugin {
  return {
    name: 'fix-manifest-path',
    apply: 'build',
    async closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const indexPath = resolve(dist, 'index.html');
      const dupManifest = resolve(dist, 'assets', 'manifest.json');
      if (existsSync(indexPath)) {
        const html = await readFile(indexPath, 'utf-8');
        const fixed = html.replace(
          /href="\.\/assets\/manifest\.json"/g,
          'href="./manifest.json"',
        );
        if (fixed !== html) await writeFile(indexPath, fixed, 'utf-8');
      }
      if (existsSync(dupManifest)) {
        await rm(dupManifest);
      }
    },
  };
}

// BrewRig builds a single inlined HTML for the SPA. credits.html is
// served as a static file from public/ (it does not need JS bundling).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    viteSingleFile({
      removeViteModuleLoader: false,
      useRecommendedBuildConfig: false,
    }),
    fixManifestPath(),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        assetFileNames: 'assets/[name][extname]',
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});
