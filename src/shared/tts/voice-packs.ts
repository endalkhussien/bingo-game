import { getBallCallAudioKey } from './amharic-ball-call';
import {
  CARTELLA_LOCKED_CLIP,
  GAME_CONTINUED_CLIP,
  GAME_STARTED_CLIP,
  GAME_STOPPED_CLIP,
  NOT_WINNER_CLIP,
  SHUFFLE_CLIP,
  WINNER_CLIP,
} from './game-clips';

/** Single bundled Amharic voice — MP3 files in public/audio/ */
export const DEFAULT_AMHARIC_VOICE = 'AMHARIC_MALE';

export function resolveVoicePackId(voiceType: string): string | null {
  if (voiceType === 'ENGLISH') return null;
  return DEFAULT_AMHARIC_VOICE;
}

/** Candidate relative paths (under public/) — first existing file wins at playback */
export function ballCallClipCandidates(number: number, _voiceType: string): string[] {
  const file = `${getBallCallAudioKey(number)}.mp3`;
  return [`audio/${file}`];
}

export function cartellaClipCandidates(number: number, _voiceType: string): string[] {
  return [`audio/cartella/${number}.mp3`];
}

export function eventClipCandidates(relativeClip: string, _voiceType: string): string[] {
  return [`audio/${relativeClip}`];
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
