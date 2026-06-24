import {
  ballCallRelativePaths,
  cartellaRelativePaths,
  gameEventRelativePaths,
} from './audio-paths';
import {
  CARTELLA_LOCKED_CLIP,
  GAME_CONTINUED_CLIP,
  GAME_STARTED_CLIP,
  GAME_STOPPED_CLIP,
  NOT_WINNER_CLIP,
  SHUFFLE_CLIP,
  WINNER_CLIP,
} from './game-clips';

/** Default bundled Amharic voice — MP3 files in public/audio/ */
export const DEFAULT_AMHARIC_VOICE = 'AMHARIC_MALE';

export function resolveVoicePackId(voiceType: string): string | null {
  if (voiceType === 'ENGLISH') return null;
  return DEFAULT_AMHARIC_VOICE;
}

/** Candidate relative paths (under public/) — first existing file wins at playback */
export function ballCallClipCandidates(number: number, voiceType: string): string[] {
  if (voiceType === 'ENGLISH') return [];
  return ballCallRelativePaths(number);
}

export function cartellaClipCandidates(number: number, voiceType: string): string[] {
  if (voiceType === 'ENGLISH') return [];
  return cartellaRelativePaths(number);
}

export function eventClipCandidates(relativeClip: string, voiceType: string): string[] {
  if (voiceType === 'ENGLISH') return [];
  return gameEventRelativePaths(relativeClip);
}

export const GAME_EVENT_CLIP_FILES = {
  started: GAME_STARTED_CLIP.replace(/^audio\//, ''),
  stopped: GAME_STOPPED_CLIP.replace(/^audio\//, ''),
  continued: GAME_CONTINUED_CLIP.replace(/^audio\//, ''),
  winner: WINNER_CLIP.replace(/^audio\//, ''),
  notWinner: NOT_WINNER_CLIP.replace(/^audio\//, ''),
  cartellaLocked: CARTELLA_LOCKED_CLIP.replace(/^audio\//, ''),
  shuffle: SHUFFLE_CLIP.replace(/^audio\//, ''),
} as const;
