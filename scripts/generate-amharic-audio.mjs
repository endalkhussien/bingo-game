#!/usr/bin/env node
/**
 * Generates offline audio for ball calls:
 * - English B/I/N/G/O letters (public/sounds/en/letters/)
 * - Amharic number words (public/sounds/am/1.mp3 … 75.mp3)
 *
 * Ball call sequence: English letter, then number in selected language.
 * Run: node scripts/generate-amharic-audio.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AM_DIR = path.join(__dirname, '../public/sounds/am');
const EN_LETTERS_DIR = path.join(__dirname, '../public/sounds/en/letters');

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
  return String(n);
}

async function fetchTts(text, lang = 'am') {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status} for "${text}"`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeIfNeeded(dest, text, lang = 'am') {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return;
  process.stdout.write(`  ${path.basename(dest)} … `);
  const buf = await fetchTts(text, lang);
  fs.writeFileSync(dest, buf);
  console.log('ok');
  await new Promise((r) => setTimeout(r, 250));
}

async function main() {
  fs.mkdirSync(AM_DIR, { recursive: true });
  fs.mkdirSync(EN_LETTERS_DIR, { recursive: true });

  console.log('English B-I-N-G-O letters…');
  for (const letter of ['B', 'I', 'N', 'G', 'O']) {
    await writeIfNeeded(path.join(EN_LETTERS_DIR, `${letter}.mp3`), letter, 'en');
  }

  console.log('Amharic number clips (1–75)…');
  for (let n = 1; n <= 75; n++) {
    await writeIfNeeded(path.join(AM_DIR, `${n}.mp3`), toAmharicNumber(n), 'am');
  }

  console.log(`Done — letters in ${EN_LETTERS_DIR}, numbers in ${AM_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
