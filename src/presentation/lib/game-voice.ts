/**
 * Game voice workflow — maps UI actions to public/audio/ event clips.
 *
 * Event clips play immediately on button click (interrupt ball calls).
 * PLAY (first start)  → game_started.mp3
 * PAUSE               → game_paused.mp3
 * RESUME              → game_continued.mp3
 * END GAME            → game_stopped.mp3
 * Valid BINGO         → winner.mp3
 * False BINGO check   → not_winner.mp3
 * Banned cartella     → cartella_locked.mp3
 * Ball call N         → {Letter}{N}.mp3  (e.g. G42.mp3)
 */
import {
  playGameStartedClip,
  playGamePausedClip,
  playGameStoppedClip,
  playGameContinuedClip,
  playWinnerClip,
  playNotWinnerClip,
  playCartellaLockedClip,
  playShuffleClip,
  playBallCallClip,
} from './amharic-audio';
import { isAmharicBundledVoice } from '@/shared/tts/amharic-voice';

function shouldPlay(voiceType: string, language?: string): boolean {
  return isAmharicBundledVoice(voiceType, language ?? 'am');
}

export function playOnGamePlay(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playGameStartedClip(voiceType, language);
}

export function playOnGamePause(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playGamePausedClip(voiceType, language);
}

export function playOnGameResume(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playGameContinuedClip(voiceType, language);
}

export function playOnGameEnd(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playGameStoppedClip(voiceType, language);
}

export function playOnWinner(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playWinnerClip(voiceType, language);
}

export function playOnNotWinner(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playNotWinnerClip(voiceType, language);
}

export function playOnCartellaBanned(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playCartellaLockedClip(voiceType, language);
}

export function playOnShuffle(voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playShuffleClip(voiceType, language);
}

export function playBallCall(number: number, voiceType: string, language?: string): Promise<boolean> {
  if (!shouldPlay(voiceType, language)) return Promise.resolve(false);
  return playBallCallClip(number, voiceType);
}
