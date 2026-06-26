/**
 * Custom voice paths under public/audio/.
 * Drop your MP3s in public/audio/ — see public/audio/README.txt
 */
import { getBallCallAudioKey } from './amharic-ball-call';
import manifestJson from './audio-manifest.json';

type AudioManifest = {
  generatedAt: string;
  ballCalls: string[];
  gameEvents: string[];
  expectedBallCalls: string[];
  counts: { ballCalls: number; gameEvents: number };
};

const manifest = manifestJson as AudioManifest;

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

export function computeBallCallFilename(number: number): string {
  return `${getBallCallAudioKey(number)}.mp3`;
}

export function computeBallCallPath(number: number): string {
  return `audio/${computeBallCallFilename(number)}`;
}

export function computeGameEventPath(event: GameEventKey): string {
  return `audio/${GAME_EVENT_FILENAMES[event]}`;
}

export function computeGameEventPaths(event: GameEventKey): string[] {
  if (event === 'paused') {
    return ['audio/game_paused.mp3', 'audio/game_stopped.mp3'];
  }
  return [computeGameEventPath(event)];
}

/** Paths to preload — only files found on disk at last manifest scan. */
export function allBallCallPaths(): string[] {
  return manifest.ballCalls.length > 0 ? [...manifest.ballCalls] : [];
}

export function allGameEventPaths(): string[] {
  return manifest.gameEvents.length > 0 ? [...manifest.gameEvents] : [];
}

export function getBundledAudioSummary(): {
  ballCalls: number;
  gameEvents: number;
  generatedAt: string;
} {
  return {
    ballCalls: manifest.counts.ballCalls,
    gameEvents: manifest.counts.gameEvents,
    generatedAt: manifest.generatedAt,
  };
}

export function isManifestedPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/^\/+/, '');
  return manifest.ballCalls.includes(normalized) || manifest.gameEvents.includes(normalized);
}
