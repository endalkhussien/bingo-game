import { getBallLetter } from '@/domain/services/bingo-engine';
import { formatAmharicBallCall, getBallCallAudioUrl } from '@/shared/tts/amharic-ball-call';
import { toAmharicNumberWord } from '@/shared/tts/voice-map';

let currentAudio: HTMLAudioElement | null = null;

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

function playUrl(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        currentAudio = null;
        resolve(true);
      };
      audio.onerror = () => {
        currentAudio = null;
        resolve(false);
      };
      const p = audio.play();
      if (p) {
        p.catch(() => {
          currentAudio = null;
          resolve(false);
        });
      }
    } catch {
      currentAudio = null;
      resolve(false);
    }
  });
}

export function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/** Combined phrase clip e.g. /audio/G52.mp3 */
export function playBallCallClip(number: number): Promise<boolean> {
  return playUrl(ballCallAudioUrl(number));
}

/** Play legacy number-only clip (cartella selection, etc.) */
export function playAmharicBall(number: number): Promise<boolean> {
  return playUrl(amharicAudioUrl(number));
}

/** B-I-N-G-O letter always in English */
export async function playEnglishBingoLetter(letter: string): Promise<boolean> {
  if (await playUrl(englishLetterUrl(letter))) return true;
  return playUrl(legacyLetterUrl(letter));
}

/** Prefer combined clip, then English letter + localized number. */
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
