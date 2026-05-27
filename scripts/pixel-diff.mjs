// Pixel-diff two screenshots and report the number of differing pixels.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [, , aPath, bPath, outPath] = process.argv;
const a = PNG.sync.read(readFileSync(aPath));
const b = PNG.sync.read(readFileSync(bPath));

const w = Math.min(a.width, b.width);
const h = Math.min(a.height, b.height);
const diff = new PNG({ width: w, height: h });

// Crop both to common size.
function crop(img) {
  if (img.width === w && img.height === h) return img;
  const c = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    img.data.copy(c.data, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4);
  }
  return c;
}

const aC = crop(a);
const bC = crop(b);
const mismatched = pixelmatch(
  aC.data, bC.data, diff.data,
  w, h,
  { threshold: 0.1, diffMask: false },
);
writeFileSync(outPath, PNG.sync.write(diff));
const total = w * h;
const pct = ((mismatched / total) * 100).toFixed(3);
console.log(`Sizes: A=${a.width}x${a.height}, B=${b.width}x${b.height}, common=${w}x${h}`);
console.log(`Mismatched pixels: ${mismatched} / ${total} (${pct}%)`);
console.log(`Diff written: ${outPath}`);
