#!/usr/bin/env node
/**
 * Generates offline Amharic ball-call audio (1–75) into public/sounds/am/.
 * Run once during dev/build when network is available: node scripts/generate-amharic-audio.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/sounds/am');

const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AMHARIC_TENS = ['', 'አስር', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠኝ'];

function toAmharicNumber(n) {
  if (n <= 0) return String(n);
  if (n < 10) return AMHARIC_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) return AMHARIC_TENS[tens];
    return `${AMHARIC_TENS[tens]} ${AMHARIC_ONES[ones]}`;
  }
  if (n === 100) return 'መቶ';
  if (n < 150) {
    const rest = n - 100;
    return rest === 0 ? 'መቶ' : `መቶ ${toAmharicNumber(rest)}`;
  }
  return String(n);
}

async function fetchTts(text) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=am&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status} for "${text}"`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const max = 75;
  let created = 0;

  for (let n = 1; n <= max; n++) {
    const dest = path.join(OUT_DIR, `${n}.mp3`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
      created++;
      continue;
    }
    const text = `ቁጥር ${toAmharicNumber(n)}`;
    process.stdout.write(`Generating ${n}/${max} … `);
    const buf = await fetchTts(text);
    fs.writeFileSync(dest, buf);
    created++;
    console.log('ok');
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`Done — ${created} files in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
