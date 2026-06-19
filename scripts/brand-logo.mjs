import fs from 'fs';
import path from 'path';

/** Drop your master logo in the project root with one of these names. */
export const BRAND_LOGO_SOURCE_NAMES = [
  'Waliya logo-01.png',
  'Waliya-logo-01.png',
];

export function loadBrandConfig(root) {
  const configPath = path.join(root, 'brand.config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function getBrandLogoFile(root) {
  const brand = loadBrandConfig(root);
  return brand.logoFile || 'logo.png';
}

export function getBrandLogoPath(root) {
  return path.join(root, 'public', 'brand', getBrandLogoFile(root));
}

export function findSourceLogo(root) {
  const candidates = [
    ...BRAND_LOGO_SOURCE_NAMES.map((name) => path.join(root, name)),
    ...BRAND_LOGO_SOURCE_NAMES.map((name) => path.join(root, 'public', 'brand', name)),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Copy Waliya logo-01.png → public/brand/logo.png when the app logo is missing. */
export function ensureBrandLogoImported(root) {
  const dest = getBrandLogoPath(root);
  if (fs.existsSync(dest)) return dest;

  const source = findSourceLogo(root);
  if (!source) return null;

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
  console.log(
    `→ Brand logo copied: ${path.basename(source)} → public/brand/${path.basename(dest)}`,
  );
  return dest;
}
