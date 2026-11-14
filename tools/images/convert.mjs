// Ubah poster PNG menjadi WebP untuk landing. Ekspor statis Next tidak mengoptimalkan gambar
// (images.unoptimized), jadi gambar disiapkan di sini sekali, lalu hasilnya di-commit.
// Sumber asli tetap di docs/; jalankan ulang bila sumbernya berubah: `cd tools && npm run images`.
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'landing', 'public', 'img');
const kb = (f) => Math.round(statSync(f).size / 102.4) / 10;

const jobs = [
  { src: 'docs/prototype/prototipe-3d-hero.png', dst: 'prototipe-hero.webp' },
  { src: 'docs/prototype/prototipe-3d-terbuka.png', dst: 'prototipe-terbuka.webp' },
];

for (const { src, dst } of jobs) {
  const from = path.join(root, src);
  const to = path.join(out, dst);
  const meta = await sharp(from).metadata();
  await sharp(from).webp({ quality: 78, effort: 6 }).toFile(to);
  console.log(`${src} (${meta.width}x${meta.height}, ${kb(from)} KB) -> landing/public/img/${dst} (${kb(to)} KB)`);
}
