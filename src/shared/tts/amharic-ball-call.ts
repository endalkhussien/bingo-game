import { getBallLetter } from '../../domain/services/bingo-engine';
import { toAmharicNumberWord } from './voice-map';

/** Ethiopic bingo column names used in spoken Amharic calls. */
export const AMHARIC_BINGO_LETTERS: Record<string, string> = {
  B: 'ቢ',
  I: 'አይ',
  N: 'ኤን',
  G: 'ጂ',
  O: 'ኦ',
};

export function toAmharicBingoLetter(letter: string): string {
  return AMHARIC_BINGO_LETTERS[letter] ?? letter;
}

/** Full Amharic phrase e.g. "ቢ አንድ", "ጂ ሀምሳ ሁለት". */
export function formatAmharicBallCall(number: number): string {
  const letter = getBallLetter(number);
  const numberWord = toAmharicNumberWord(number);
  if (!letter) return numberWord;
  return `${toAmharicBingoLetter(letter)} ${numberWord}`;
}

/** Audio file key e.g. B1, G52, O75 (maps to /audio/B1.mp3). */
export function getBallCallAudioKey(number: number): string {
  const letter = getBallLetter(number);
  return letter ? `${letter}${number}` : String(number);
}

export function getBallCallAudioUrl(number: number): string {
  return `/audio/${getBallCallAudioKey(number)}.mp3`;
}
