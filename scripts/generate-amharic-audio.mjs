#!/usr/bin/env node
/**
 * Generates offline Amharic audio:
 * - Combined ball calls: public/audio/B1.mp3 … O75.mp3
 * - English B/I/N/G/O letters: public/sounds/en/letters/
 * - Amharic number fallback: public/sounds/am/1.mp3 … 75.mp3
 * - Cartella pick voice: public/sounds/cartella/1.mp3 … N.mp3 ("ካርቴላ …")
 *
 * Run: npm run generate:amharic-audio
 * Optional: CARTELLA_AUDIO_MAX=500 node scripts/generate-amharic-audio.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toAmharicNumber, formatCartellaPhrase } from './amharic-numbers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.config.json'), 'utf8'));

const AUDIO_DIR = path.join(root, 'public/audio');
const AM_DIR = path.join(root, 'public/sounds/am');
const CARTELLA_DIR = path.join(root, 'public/sounds/cartella');
const EN_LETTERS_DIR = path.join(root, 'public/sounds/en/letters');

const AMHARIC_LETTERS = { B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ' };

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
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
  fs.mkdirSync(CARTELLA_DIR, { recursive: true });
  fs.mkdirSync(EN_LETTERS_DIR, { recursive: true });

  const cartellaMax = Number(process.env.CARTELLA_AUDIO_MAX) || brand.initialCartellaCount || 150;

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

  console.log(`Cartella pick voice (1–${cartellaMax})…`);
  for (let n = 1; n <= cartellaMax; n++) {
    await writeIfNeeded(path.join(CARTELLA_DIR, `${n}.mp3`), formatCartellaPhrase(n), 'am');
  }

  console.log(`Done — ball calls in ${AUDIO_DIR}, cartella in ${CARTELLA_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
