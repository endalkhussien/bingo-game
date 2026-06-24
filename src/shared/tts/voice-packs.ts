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

/** Folder name under public/audio/voices/ for each Amharic voice option */
export const AMHARIC_VOICE_PACKS: Record<string, string> = {
  AMHARIC_MALE: 'male1',
  AMHARIC_MALE_2: 'male2',
  AMHARIC_FEMALE: 'female1',
  AMHARIC_FEMALE_2: 'female2',
};

export const DEFAULT_AMHARIC_VOICE_PACK = 'male1';

export function resolveVoicePackId(voiceType: string): string | null {
  if (voiceType === 'ENGLISH') return null;
  return AMHARIC_VOICE_PACKS[voiceType] ?? DEFAULT_AMHARIC_VOICE_PACK;
}

export function listRegisteredVoicePackIds(): string[] {
  return [...new Set(Object.values(AMHARIC_VOICE_PACKS))];
}

/** Candidate relative paths (under public/) — first existing file wins at playback */
export function ballCallClipCandidates(number: number, voiceType: string): string[] {
  const pack = resolveVoicePackId(voiceType);
  if (!pack) return [];
  const file = `${getBallCallAudioKey(number)}.mp3`;
  const candidates = [`audio/voices/${pack}/${file}`];
  if (pack === DEFAULT_AMHARIC_VOICE_PACK) {
    candidates.push(`audio/${file}`);
  }
  return candidates;
}

export function cartellaClipCandidates(number: number, voiceType: string): string[] {
  const pack = resolveVoicePackId(voiceType);
  if (!pack) return [];
  const file = `${number}.mp3`;
  const candidates = [`audio/voices/${pack}/cartella/${file}`];
  if (pack === DEFAULT_AMHARIC_VOICE_PACK) {
    candidates.push(`audio/cartella/${file}`);
  }
  return candidates;
}

export function eventClipCandidates(relativeClip: string, voiceType: string): string[] {
  const pack = resolveVoicePackId(voiceType);
  if (!pack) return [];
  const candidates = [`audio/voices/${pack}/${relativeClip}`];
  if (pack === DEFAULT_AMHARIC_VOICE_PACK) {
    candidates.push(`audio/${relativeClip}`);
  }
  return candidates;
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
