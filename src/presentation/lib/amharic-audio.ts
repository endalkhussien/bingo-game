import { getBallLetter } from '@/domain/services/bingo-engine';
import { formatAmharicBallCall, getBallCallAudioKey } from '@/shared/tts/amharic-ball-call';
import {
  CARTELLA_LOCKED_CLIP,
  GAME_CONTINUED_CLIP,
  GAME_STARTED_CLIP,
  GAME_STOPPED_CLIP,
  NOT_WINNER_CLIP,
  WINNER_CLIP,
} from '@/shared/tts/game-clips';
import { isElectron } from '@/shared/runtime';

let currentAudio: HTMLAudioElement | null = null;

function buildMediaUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  if (isElectron()) {
    return `waliya-media://${clean}`;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location?.origin;
    if (origin && origin !== 'null' && origin.startsWith('http')) {
      return `${origin}/${clean}`;
    }
  }
  return `/${clean}`;
}

export function amharicAudioUrl(number: number): string {
  return buildMediaUrl(`sounds/am/${number}.mp3`);
}

export function ballCallAudioUrl(number: number): string {
  return buildMediaUrl(`audio/${getBallCallAudioKey(number)}.mp3`);
}

export function cartellaAudioUrl(number: number): string {
  return buildMediaUrl(`sounds/cartella/${number}.mp3`);
}

function englishLetterUrl(letter: string): string {
  return buildMediaUrl(`sounds/en/letters/${letter}.mp3`);
}

function legacyLetterUrl(letter: string): string {
  return buildMediaUrl(`sounds/am/letters/${letter}.mp3`);
}

function waitForCanPlay(audio: HTMLAudioElement, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve(true);
      return;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('error', onError);
      window.clearTimeout(timer);
      resolve(ok);
    };

    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), timeoutMs);

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

function playUrl(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const audio = new Audio(url);
    audio.preload = 'auto';

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };

    const safetyTimer = window.setTimeout(() => {
      audio.pause();
      settle(false);
    }, 10000);

    void (async () => {
      try {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = audio;

        const ready = await waitForCanPlay(audio, 2500);
        if (!ready) {
          settle(false);
          return;
        }

        audio.onended = () => settle(true);
        audio.onerror = () => settle(false);

        await audio.play();
      } catch {
        settle(false);
      }
    })();
  });
}

/** Warm browser cache for all 75 ball-call clips (call once when game board loads). */
export function preloadBallCallClips(): void {
  if (typeof window === 'undefined') return;
  for (let n = 1; n <= 75; n++) {
    const audio = new Audio(ballCallAudioUrl(n));
    audio.preload = 'auto';
    audio.load();
  }
}

export function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function playBallCallClip(number: number): Promise<boolean> {
  return playUrl(ballCallAudioUrl(number));
}

export function playCartellaClip(number: number): Promise<boolean> {
  return playUrl(cartellaAudioUrl(number));
}

function eventClipUrl(relativePath: string): string {
  return buildMediaUrl(relativePath);
}

export async function playEventClip(relativePath: string): Promise<boolean> {
  return playUrl(eventClipUrl(relativePath));
}

export function playGameStartedClip(): Promise<boolean> {
  return playEventClip(GAME_STARTED_CLIP);
}

export function playGameStoppedClip(): Promise<boolean> {
  return playEventClip(GAME_STOPPED_CLIP);
}

export function playGameContinuedClip(): Promise<boolean> {
  return playEventClip(GAME_CONTINUED_CLIP);
}

export function playWinnerClip(): Promise<boolean> {
  return playEventClip(WINNER_CLIP);
}

export function playNotWinnerClip(): Promise<boolean> {
  return playEventClip(NOT_WINNER_CLIP);
}

export function playCartellaLockedClip(): Promise<boolean> {
  return playEventClip(CARTELLA_LOCKED_CLIP);
}

export function playAmharicBall(number: number): Promise<boolean> {
  return playUrl(amharicAudioUrl(number));
}

export async function playEnglishBingoLetter(letter: string): Promise<boolean> {
  if (await playUrl(englishLetterUrl(letter))) return true;
  return playUrl(legacyLetterUrl(letter));
}

export async function playBallCallAudio(number: number, language: string): Promise<boolean> {
  if (language === 'am' && await playBallCallClip(number)) {
    return true;
  }

  const letter = getBallLetter(number);
  if (!letter) {
    return language === 'am' ? playAmharicBall(number) : false;
  }

  const letterPlayed = await playEnglishBingoLetter(letter);
  if (language === 'am') {
    const numberPlayed = await playAmharicBall(number);
    return letterPlayed || numberPlayed;
  }
  return letterPlayed;
}

export function getBallCallDisplayText(number: number, language: string): string {
  if (language === 'am') return formatAmharicBallCall(number);
  const letter = getBallLetter(number);
  return letter ? `${letter} ${number}` : String(number);
}

export { formatAmharicBallCall };
