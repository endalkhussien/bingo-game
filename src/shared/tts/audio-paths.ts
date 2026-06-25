import {
  computeBallCallPath,
  computeCartellaPaths,
  computeGameEventPath,
  GAME_EVENT_FILENAMES,
  type GameEventKey,
} from './bundled-audio-catalog';

/** @deprecated Use bundled-audio-catalog directly */
export function ballCallRelativePaths(number: number): string[] {
  return [computeBallCallPath(number)];
}

/** @deprecated Use bundled-audio-catalog directly */
export function cartellaRelativePaths(number: number): string[] {
  return computeCartellaPaths(number);
}

/** @deprecated Use bundled-audio-catalog directly */
export function gameEventRelativePaths(filename: string): string[] {
  return [`audio/${filename}`];
}

export { GAME_EVENT_FILENAMES, type GameEventKey };
