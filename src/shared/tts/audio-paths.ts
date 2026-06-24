import { getBallCallAudioKey } from './amharic-ball-call';

/**
 * Relative paths under public/ (copied to out/ on build).
 * First existing file wins at playback — order matters.
 */

/** Ball call clips — e.g. audio/B1.mp3 … audio/O75.mp3 */
export function ballCallRelativePaths(number: number): string[] {
  const key = getBallCallAudioKey(number);
  return [`audio/${key}.mp3`];
}

/** Cartella pick voice — e.g. sounds/cartella/1.mp3 or audio/cartella/1.mp3 */
export function cartellaRelativePaths(number: number): string[] {
  const file = `${number}.mp3`;
  return [`audio/cartella/${file}`, `sounds/cartella/${file}`];
}

/** Game event clips — e.g. audio/game_started.mp3 */
export function gameEventRelativePaths(filename: string): string[] {
  return [`audio/${filename}`];
}
