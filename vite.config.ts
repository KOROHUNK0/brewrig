import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Post-build HTML touch-ups to match the historical (backup) layout:
//   1. Move the inlined `<script type="module">` from <head> to <body>
//      (just after <div id="root"></div>), matching the original output
//      so CSS parses before JS executes and inline style ordering matches.
//   2. Drop the `crossorigin` attribute (inline scripts do not need it).
//   3. Restore `<link rel="manifest" href="./manifest.json">` (Vite rewrites
//      it to ./assets/manifest.json during HTML processing).
//   4. Remove the duplicate ./assets/manifest.json that Vite emitted.
function alignWithBackup(): Plugin {
  return {
    name: 'align-with-backup-layout',
    apply: 'build',
    async closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const indexPath = resolve(dist, 'index.html');
      const dupManifest = resolve(dist, 'assets', 'manifest.json');
      if (!existsSync(indexPath)) return;
      let html = await readFile(indexPath, 'utf-8');

      // Capture the inlined React module script (with possible attributes).
      const scriptMatch = html.match(
        /\s*<script\b[^>]*\btype="module"[^>]*>[\s\S]*?<\/script>/,
      );
      if (scriptMatch) {
        const original = scriptMatch[0];
        const cleaned = original
          .replace(/\s+crossorigin\b/, '')
          .replace(/^\s+/, '\n');
        // Remove the script from the head.
        // Use a function replacer so the script body (which contains literal
        // `$&` / `$1` sequences as part of regex-replacement patterns inside
        // React's bundled code) is not treated as a $-replacement template.
        const beforeRemoval = html.indexOf(original);
        if (beforeRemoval !== -1) {
          html =
            html.slice(0, beforeRemoval) +
            html.slice(beforeRemoval + original.length);
        }
        // Insert it in body, right after the root div — using indexOf splice
        // for the same reason (avoid $-sequence interpretation).
        const rootMarker = '<div id="root"></div>';
        const rootPos = html.indexOf(rootMarker);
        if (rootPos !== -1) {
          const insertAt = rootPos + rootMarker.length;
          html = html.slice(0, insertAt) + cleaned + html.slice(insertAt);
        }
      }

      // Restore manifest path.
      html = html.replace(
        /href="\.\/assets\/manifest\.json"/g,
        'href="./manifest.json"',
      );

      // Strip stray attributes that viteSingleFile adds to <style> tags
      // (rel="stylesheet" / crossorigin are only meaningful on <link>).
      html = html.replace(
        /<style\b[^>]*>/g,
        '<style>',
      );

      await writeFile(indexPath, html, 'utf-8');

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
    alignWithBackup(),
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
