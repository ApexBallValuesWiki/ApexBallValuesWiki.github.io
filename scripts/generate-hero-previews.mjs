import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Reproducible desktop presentation copies of the 17 supplied PNGs. The
// originals remain untouched and are still used on mobile and as a fallback.
// These lossless WebPs precompute the hero's existing grayscale/contrast/
// brightness treatment and use a conservative Lanczos enlargement and mild
// sharpening. This cannot recreate details absent from the source images.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/assets/units/provided');
const destination = path.join(root, 'src/assets/units/hero-desktop');
await mkdir(destination, { recursive: true });
const files = (await readdir(source)).filter((file) => file.endsWith('.png')).sort();
if (files.length !== 17) throw new Error(`Expected the 17 supplied images, found ${files.length}.`);

for (const file of files) {
  const { data, info } = await sharp(path.join(source, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    // CSS grayscale(1), contrast(1.1), brightness(1.12) in sRGB.
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    const adjusted = Math.round(Math.max(0, Math.min(255, ((luminance - 127.5) * 1.1 + 127.5) * 1.12)));
    data[index] = adjusted;
    data[index + 1] = adjusted;
    data[index + 2] = adjusted;
  }
  await sharp(data, { raw: info })
    .resize(info.width * 2, info.height * 2, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.8, m1: 0.3, m2: 0.8 })
    .webp({ lossless: true, effort: 6 })
    .toFile(path.join(destination, file.replace(/\.png$/, '.webp')));
  console.log(`Prepared ${file}`);
}
