#!/usr/bin/env node
/**
 * Build Windows app icon from public/brand/logo.png (Waliya logo).
 * Output: public/brand/icon.png + public/brand/icon.ico
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureBrandLogoImported, getBrandLogoPath } from './brand-logo.mjs';

let sharp;
let pngToIco;
try {
  sharp = (await import('sharp')).default;
  pngToIco = (await import('png-to-ico')).default;
} catch {
  console.error(
    'Missing dev dependencies for icon generation (sharp, png-to-ico).\n' +
      'Run: npm install\n' +
      'Or use committed icons: public/brand/icon.ico + icon.png',
  );
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconPng = path.join(root, 'public/brand/icon.png');
const iconIco = path.join(root, 'public/brand/icon.ico');

const sizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  ensureBrandLogoImported(root);
  const logoPath = getBrandLogoPath(root);

  if (!fs.existsSync(logoPath)) {
    console.error(
      'Missing brand logo.\n' +
        'Place Waliya logo-01.png in the project root (or public/brand/), then run:\n' +
        '  npm run generate:icon',
    );
    process.exit(1);
  }

  const iconBg = { r: 0, g: 0, b: 0, alpha: 1 };

  const logo = fs.readFileSync(logoPath);
  await sharp(logo).resize(256, 256, { fit: 'contain', background: iconBg }).png().toFile(iconPng);

  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(logo)
        .resize(size, size, { fit: 'contain', background: iconBg })
        .png()
        .toBuffer(),
    ),
  );
  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(iconIco, ico);

  console.log('→ App icon generated: public/brand/icon.png, public/brand/icon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
