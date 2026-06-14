import { getBallLetter } from '../../domain/services/bingo-engine';
import { toAmharicNumberWord } from '../../shared/tts/voice-map';

/** Display text e.g. "B 34" */
export function formatBallCallLabel(number: number, language: string): string {
  const letter = getBallLetter(number);
  if (!letter) return String(number);
  const numPart = language === 'am' ? toAmharicNumberWord(number) : String(number);
  return `${letter} ${numPart}`;
}

/** Part 1: always English letter. Part 2: number in selected language. */
export function getBallCallSpeechParts(number: number, language: string): {
  letter: string;
  numberText: string;
  numberLang: string;
} {
  const letter = getBallLetter(number);
  const isAmharic = language === 'am';
  return {
    letter,
    numberText: isAmharic ? toAmharicNumberWord(number) : String(number),
    numberLang: isAmharic ? 'am-ET' : 'en-US',
  };
}
