#!/usr/bin/env node
/**
 * Build Windows app icon from public/brand/logo.svg (Waliya logo).
 * Output: public/brand/icon.png + public/brand/icon.ico
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoSvg = path.join(root, 'public/brand/logo.svg');
const iconPng = path.join(root, 'public/brand/icon.png');
const iconIco = path.join(root, 'public/brand/icon.ico');

const sizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  if (!fs.existsSync(logoSvg)) {
    console.error('Missing public/brand/logo.svg');
    process.exit(1);
  }

  const svg = fs.readFileSync(logoSvg);
  await sharp(svg).resize(256, 256).png().toFile(iconPng);

  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()),
  );
  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(iconIco, ico);

  console.log('→ App icon generated: public/brand/icon.png, public/brand/icon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
