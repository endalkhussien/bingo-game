#!/usr/bin/env node
/**
 * Generates placeholder Amharic audio under public/audio/.
 * Prefer recording your own MP3s — see public/audio/README.txt
 *
 * Run: npm run generate:amharic-audio
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toAmharicNumber, formatCartellaPhrase } from './amharic-numbers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.config.json'), 'utf8'));

const AUDIO_DIR = path.join(root, 'public/audio');
const CARTELLA_DIR = path.join(AUDIO_DIR, 'cartella');

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
  process.stdout.write(`  ${path.relative(root, dest)} … `);
  const buf = await fetchTts(text, lang);
  fs.writeFileSync(dest, buf);
  console.log('ok');
  await new Promise((r) => setTimeout(r, 300));
}

async function main() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(CARTELLA_DIR, { recursive: true });

  const cartellaMax = Number(process.env.CARTELLA_AUDIO_MAX) || brand.initialCartellaCount || 150;

  console.log('Generating Amharic audio under public/audio/ …');
  console.log('(Record your own clips — see public/audio/README.txt)\n');

  for (let n = 1; n <= 75; n++) {
    const key = `${getBallLetter(n)}${n}`;
    await writeIfNeeded(path.join(AUDIO_DIR, `${key}.mp3`), formatAmharicBallCall(n), 'am');
  }

  const events = [
    ['game_started.mp3', 'ጨዋታ ጀመረች'],
    ['game_paused.mp3', 'ጨዋታ ቆመ'],
    ['game_stopped.mp3', 'ጨዋታ አለቀ'],
    ['game_continued.mp3', 'ጨዋታ ቀጠለ'],
    ['winner.mp3', 'አሸናፊ'],
    ['not_winner.mp3', 'አሸናፊ አይደለም'],
    ['cartella_locked.mp3', 'ካርቴላ ተቆል'],
    ['shuffle.mp3', 'ተቀይሯል'],
  ];
  for (const [file, phrase] of events) {
    await writeIfNeeded(path.join(AUDIO_DIR, file), phrase, 'am');
  }

  console.log(`Cartella pick voice is disabled — skipping 1–${cartellaMax} cartella clips.`);

  console.log('\nDone. Replace placeholders with your own recordings in public/audio/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
