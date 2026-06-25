/**
 * Bundled voice catalog — computes MP3 paths under public/ for Waliya game audio.
 *
 * All Amharic Male 1 clips:
 *   public/audio/B1.mp3 … O75.mp3          (ball calls)
 *   public/audio/game_started.mp3, …       (game events)
 */
import { getBallCallAudioKey } from './amharic-ball-call';
import manifest from './audio-manifest.json';

export type GameEventKey =
  | 'started'
  | 'paused'
  | 'stopped'
  | 'continued'
  | 'winner'
  | 'notWinner'
  | 'cartellaLocked'
  | 'shuffle';

export const GAME_EVENT_FILENAMES: Record<GameEventKey, string> = {
  started: 'game_started.mp3',
  paused: 'game_paused.mp3',
  stopped: 'game_stopped.mp3',
  continued: 'game_continued.mp3',
  winner: 'winner.mp3',
  notWinner: 'not_winner.mp3',
  cartellaLocked: 'cartella_locked.mp3',
  shuffle: 'shuffle.mp3',
};

export const BUNDLED_BALL_COUNT = 75;

/** Compute ball-call filename from draw number, e.g. 42 → "G42.mp3" */
export function computeBallCallFilename(number: number): string {
  return `${getBallCallAudioKey(number)}.mp3`;
}

/** Relative path for a ball call, e.g. "audio/G42.mp3" */
export function computeBallCallPath(number: number): string {
  return `audio/${computeBallCallFilename(number)}`;
}

/** Relative paths for cartella pick voice (first existing file wins at playback). */
export function computeCartellaPaths(number: number): string[] {
  const file = `${number}.mp3`;
  const computed = [`audio/cartella/${file}`, `sounds/cartella/${file}`];
  const fromManifest = manifest.cartella.filter((p) => p.endsWith(`/${file}`));
  return [...new Set([...fromManifest, ...computed])];
}

/** Relative path for a game event clip, e.g. "audio/game_started.mp3" */
export function computeGameEventPath(event: GameEventKey): string {
  return `audio/${GAME_EVENT_FILENAMES[event]}`;
}

/** Ordered candidates — first existing file wins at playback (see audio-manifest scan). */
export function computeGameEventPaths(event: GameEventKey): string[] {
  if (event === 'paused') {
    return ['audio/game_paused.mp3', 'audio/game_stopped.mp3'];
  }
  return [computeGameEventPath(event)];
}

/** All ball-call paths to preload (from manifest when present, else computed 1–75). */
export function allBallCallPaths(): string[] {
  if (manifest.ballCalls.length >= BUNDLED_BALL_COUNT) {
    return [...manifest.ballCalls];
  }
  const paths: string[] = [];
  for (let n = 1; n <= BUNDLED_BALL_COUNT; n++) {
    paths.push(computeBallCallPath(n));
  }
  return paths;
}

/** All game event paths to preload. */
export function allGameEventPaths(): string[] {
  if (manifest.gameEvents.length > 0) {
    return [...manifest.gameEvents];
  }
  return (Object.keys(GAME_EVENT_FILENAMES) as GameEventKey[])
    .filter((key) => key !== 'paused')
    .map(computeGameEventPath);
}

/** Summary for diagnostics (admin / console). */
export function getBundledAudioSummary(): {
  ballCalls: number;
  gameEvents: number;
  cartella: number;
  generatedAt: string;
} {
  return {
    ballCalls: manifest.counts.ballCalls,
    gameEvents: manifest.counts.gameEvents,
    cartella: manifest.counts.cartella,
    generatedAt: manifest.generatedAt,
  };
}

/** True if manifest lists this relative path (build-time scan of public/). */
export function isManifestedPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/^\/+/, '');
  return (
    manifest.ballCalls.includes(normalized)
    || manifest.gameEvents.includes(normalized)
    || manifest.cartella.includes(normalized)
  );
}
