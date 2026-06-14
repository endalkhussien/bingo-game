import { getBallLetter } from '../../domain/services/bingo-engine';
import { formatAmharicBallCall } from './amharic-ball-call';
import { toAmharicNumberWord } from '../../shared/tts/voice-map';

/** Display text e.g. "B 34" or "ጂ ሀምሳ ሁለት" */
export function formatBallCallLabel(number: number, language: string): string {
  if (language === 'am') return formatAmharicBallCall(number);
  const letter = getBallLetter(number);
  return letter ? `${letter} ${number}` : String(number);
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
