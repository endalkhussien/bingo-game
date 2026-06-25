import {
  computeBallCallPath,
  computeCartellaPaths,
  computeGameEventPaths,
  GAME_EVENT_FILENAMES,
  type GameEventKey,
} from './bundled-audio-catalog';

/** Default bundled Amharic voice — MP3 files in public/audio/ */
export const DEFAULT_AMHARIC_VOICE = 'AMHARIC_MALE';

export function resolveVoicePackId(voiceType: string): string | null {
  if (voiceType === 'ENGLISH') return null;
  return DEFAULT_AMHARIC_VOICE;
}

/** Candidate relative paths (under public/) — first existing file wins at playback */
export function ballCallClipCandidates(number: number, voiceType: string): string[] {
  if (voiceType === 'ENGLISH') return [];
  return [computeBallCallPath(number)];
}

export function cartellaClipCandidates(number: number, voiceType: string): string[] {
  if (voiceType === 'ENGLISH') return [];
  return computeCartellaPaths(number);
}

export function eventClipCandidates(event: GameEventKey, voiceType: string): string[] {
  if (voiceType === 'ENGLISH') return [];
  return computeGameEventPaths(event);
}

export const GAME_EVENT_CLIP_FILES = GAME_EVENT_FILENAMES;
