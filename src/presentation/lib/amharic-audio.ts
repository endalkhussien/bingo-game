/** Ball call audio — English letter first, then number in selected language */
import { getBallLetter } from '@/domain/services/bingo-engine';

let currentAudio: HTMLAudioElement | null = null;

export function amharicAudioUrl(number: number): string {
  return `/sounds/am/${number}.mp3`;
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
        currentAudio = null;
      }
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      const p = audio.play();
      if (p) p.catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
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

/** English letter MP3, then Amharic number MP3 (number part only) */
export async function playBallCallAudio(number: number, language: string): Promise<boolean> {
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
