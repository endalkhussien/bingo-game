#!/usr/bin/env node
/**
 * Scan public/audio/ and write audio-manifest.json.
 * Run: npm run generate:audio-manifest
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outPath = path.join(root, 'src/shared/tts/audio-manifest.json');

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
}

function expectedBallName(n) {
  return `${getBallLetter(n)}${n}.mp3`;
}

const EVENT_FILES = [
  'game_started.mp3',
  'game_stopped.mp3',
  'game_continued.mp3',
  'game_paused.mp3',
  'winner.mp3',
  'not_winner.mp3',
  'cartella_locked.mp3',
  'shuffle.mp3',
];

function listMp3s(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mp3') && fs.statSync(path.join(dir, f)).size >= 500)
    .map((f) => `${prefix}/${f}`.replace(/\\/g, '/'));
}

const audioDir = path.join(root, 'public/audio');
const ballCalls = listMp3s(audioDir, 'audio').filter((p) => /\/[BINGO]\d+\.mp3$/i.test(p));
const gameEvents = listMp3s(audioDir, 'audio').filter((p) =>
  EVENT_FILES.some((e) => p.endsWith(`/${e}`)),
);

const expectedBalls = [];
for (let n = 1; n <= 75; n++) {
  expectedBalls.push(`audio/${expectedBallName(n)}`);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  ballCalls: ballCalls.sort(),
  gameEvents: gameEvents.sort(),
  expectedBallCalls: expectedBalls,
  counts: {
    ballCalls: ballCalls.length,
    gameEvents: gameEvents.length,
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `audio-manifest.json: ${manifest.counts.ballCalls} ball, ${manifest.counts.gameEvents} events`,
);

if (manifest.counts.ballCalls === 0 && manifest.counts.gameEvents === 0) {
  console.log('  (no MP3s yet — add recordings to public/audio/)');
} else if (manifest.counts.ballCalls < 75) {
  console.warn(`  warning: ${manifest.counts.ballCalls}/75 ball-call files in public/audio/`);
}
