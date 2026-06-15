import { getBallLetter } from '@/domain/services/bingo-engine';
import { formatAmharicBallCall, getBallCallAudioUrl } from '@/shared/tts/amharic-ball-call';

let currentAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, HTMLAudioElement>();

export function amharicAudioUrl(number: number): string {
  return `/sounds/am/${number}.mp3`;
}

export function ballCallAudioUrl(number: number): string {
  return getBallCallAudioUrl(number);
}

function englishLetterUrl(letter: string): string {
  return `/sounds/en/letters/${letter}.mp3`;
}

function legacyLetterUrl(letter: string): string {
  return `/sounds/am/letters/${letter}.mp3`;
}

function getCachedAudio(url: string): HTMLAudioElement {
  let audio = audioCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(url, audio);
  }
  return audio;
}

/** Warm browser cache for all 75 ball-call clips (call once when game board loads). */
export function preloadBallCallClips(): void {
  if (typeof window === 'undefined') return;
  for (let n = 1; n <= 75; n++) {
    getCachedAudio(ballCallAudioUrl(n));
  }
}

function playUrl(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    let audio: HTMLAudioElement | null = null;

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      if (audio && currentAudio === audio) currentAudio = null;
      resolve(ok);
    };

    const safetyTimer = window.setTimeout(() => settle(false), 15000);

    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }

      audio = getCachedAudio(url);
      audio.currentTime = 0;
      currentAudio = audio;

      audio.onended = () => settle(true);
      audio.onerror = () => settle(false);

      const started = audio.play();
      if (started) {
        started.catch(() => settle(false));
      }
    } catch {
      settle(false);
    }
  });
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
