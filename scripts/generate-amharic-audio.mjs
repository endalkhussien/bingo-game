#!/usr/bin/env node
/**
 * Generates offline ball-call audio:
 * - Combined Amharic phrases: public/audio/B1.mp3 … O75.mp3
 * - English B/I/N/G/O letters (public/sounds/en/letters/)
 * - Amharic number words (public/sounds/am/1.mp3 … 75.mp3) — fallback clips
 *
 * Run: npm run generate:amharic-audio
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '../public/audio');
const AM_DIR = path.join(__dirname, '../public/sounds/am');
const EN_LETTERS_DIR = path.join(__dirname, '../public/sounds/en/letters');

const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AMHARIC_TENS = ['', 'አስር', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠኝ'];
const AMHARIC_TEENS = {
  10: 'አስር',
  11: 'አስራ አንድ',
  12: 'አስራ ሁለት',
  13: 'አስራ ሶስት',
  14: 'አስራ አራት',
  15: 'አስራ አምስት',
  16: 'አስራ ስድስት',
  17: 'አስራ ሰባት',
  18: 'አስራ ስምንት',
  19: 'አስራ ዘጠኝ',
};
const AMHARIC_LETTERS = { B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ' };

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
}

function toAmharicNumber(n) {
  if (n <= 0) return String(n);
  if (n >= 10 && n <= 19) return AMHARIC_TEENS[n];
  if (n < 10) return AMHARIC_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) return AMHARIC_TENS[tens];
    return `${AMHARIC_TENS[tens]} ${AMHARIC_ONES[ones]}`;
  }
  return String(n);
}

function formatAmharicBallCall(n) {
  const letter = getBallLetter(n);
  const word = toAmharicNumber(n);
  return letter ? `${AMHARIC_LETTERS[letter]} ${word}` : word;
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
  await new Promise((r) => setTimeout(r, 300));
}

async function main() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(AM_DIR, { recursive: true });
  fs.mkdirSync(EN_LETTERS_DIR, { recursive: true });

  console.log('Combined Amharic ball calls (B1–O75)…');
  for (let n = 1; n <= 75; n++) {
    const key = `${getBallLetter(n)}${n}`;
    await writeIfNeeded(path.join(AUDIO_DIR, `${key}.mp3`), formatAmharicBallCall(n), 'am');
  }

  console.log('English B-I-N-G-O letters…');
  for (const letter of ['B', 'I', 'N', 'G', 'O']) {
    await writeIfNeeded(path.join(EN_LETTERS_DIR, `${letter}.mp3`), letter, 'en');
  }

  console.log('Amharic number fallback clips (1–75)…');
  for (let n = 1; n <= 75; n++) {
    await writeIfNeeded(path.join(AM_DIR, `${n}.mp3`), toAmharicNumber(n), 'am');
  }

  console.log(`Done — combined calls in ${AUDIO_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
