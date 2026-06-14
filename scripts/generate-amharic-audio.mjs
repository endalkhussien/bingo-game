#!/usr/bin/env node
/**
 * Generates offline Amharic ball-call audio into public/sounds/am/.
 * Ball calls use B-I-N-G-O letter + number (e.g. "G ሰባ አራት").
 *
 * Run: node scripts/generate-amharic-audio.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/sounds/am');
const LETTERS_DIR = path.join(OUT_DIR, 'letters');
const CALLS_DIR = path.join(OUT_DIR, 'calls');

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
  if (n <= 150) {
    const rest = n - 100;
    return rest === 0 ? 'መቶ' : `መቶ ${toAmharicNumber(rest)}`;
  }
  return String(n);
}

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
}

async function fetchTts(text) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=am&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status} for "${text}"`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeIfNeeded(dest, text) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return false;
  process.stdout.write(`  ${path.basename(dest)} … `);
  const buf = await fetchTts(text);
  fs.writeFileSync(dest, buf);
  console.log('ok');
  await new Promise((r) => setTimeout(r, 250));
  return true;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(LETTERS_DIR, { recursive: true });
  fs.mkdirSync(CALLS_DIR, { recursive: true });

  console.log('Generating B-I-N-G-O letter clips…');
  for (const letter of ['B', 'I', 'N', 'G', 'O']) {
    await writeIfNeeded(path.join(LETTERS_DIR, `${letter}.mp3`), letter);
  }

  console.log('Generating number clips (1–75) and full ball calls…');
  for (let n = 1; n <= 75; n++) {
    const letter = getBallLetter(n);
    const amNum = toAmharicNumber(n);
    await writeIfNeeded(path.join(OUT_DIR, `${n}.mp3`), amNum);
    if (letter) {
      await writeIfNeeded(path.join(CALLS_DIR, `${letter}-${n}.mp3`), `${letter} ${amNum}`);
    }
  }

  console.log(`Done — audio in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
