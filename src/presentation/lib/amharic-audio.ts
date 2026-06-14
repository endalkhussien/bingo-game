/** Offline Amharic ball announcements — letter + number (e.g. B then 34) */
import { getBallLetter } from '@/domain/services/bingo-engine';

let currentAudio: HTMLAudioElement | null = null;

export function amharicAudioUrl(number: number): string {
  return `/sounds/am/${number}.mp3`;
}

function amharicLetterUrl(letter: string): string {
  return `/sounds/am/letters/${letter}.mp3`;
}

function amharicFullCallUrl(letter: string, number: number): string {
  return `/sounds/am/calls/${letter}-${number}.mp3`;
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

/** Play ball call with B-I-N-G-O letter then number — hall style "B 34", "I 23" */
export async function playAmharicBallCall(number: number): Promise<boolean> {
  const letter = getBallLetter(number);
  if (!letter) return playAmharicBall(number);

  if (await playUrl(amharicFullCallUrl(letter, number))) return true;

  const letterPlayed = await playUrl(amharicLetterUrl(letter));
  const numberPlayed = await playUrl(amharicAudioUrl(number));
  return letterPlayed || numberPlayed;
}
