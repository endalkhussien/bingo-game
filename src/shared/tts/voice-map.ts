import { getBallLabel, getBallLetter } from '../../domain/services/bingo-engine';

const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AMHARIC_TENS = ['', 'አስር', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠኝ'];

function toAmharicNumber(n: number): string {
  if (n <= 0) return String(n);
  if (n < 10) return AMHARIC_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) return AMHARIC_TENS[tens];
    return `${AMHARIC_TENS[tens]} ${AMHARIC_ONES[ones]}`;
  }
  if (n === 100) return 'መቶ';
  if (n <= 150) {
    const rest = n - 100;
    return rest === 0 ? 'መቶ' : `መቶ ${toAmharicNumber(rest)}`;
  }
  return String(n);
}

export function toAmharicNumberWord(n: number): string {
  return toAmharicNumber(n);
}

export function buildAnnouncement(
  number: number,
  voiceType: string,
  language: string,
): { text: string; lang: string; isAmharic: boolean; preferFemale: boolean } {
  const isAmharic = language === 'am';
  const preferFemale = voiceType.includes('FEMALE');
  const letter = getBallLetter(number);

  if (isAmharic) {
    return {
      text: letter ? `${letter} ${toAmharicNumber(number)}` : `ቁጥር ${toAmharicNumber(number)}`,
      lang: 'am-ET',
      isAmharic: true,
      preferFemale,
    };
  }

  const label = getBallLabel(number);
  const [, num] = label.includes('-') ? label.split('-') : ['', String(number)];
  return {
    text: letter ? `${letter} ${num}` : `Number ${number}`,
    lang: 'en-US',
    isAmharic: false,
    preferFemale,
  };
}

/** Spoken when an agent selects a player cartella on the game board */
export function buildCartellaAnnouncement(
  number: number,
  voiceType: string,
  language: string,
): { text: string; lang: string; isAmharic: boolean; preferFemale: boolean } {
  const isAmharic = language === 'am';
  const preferFemale = voiceType.includes('FEMALE');

  if (isAmharic) {
    return {
      text: `ካርቴላ ${toAmharicNumber(number)}`,
      lang: 'am-ET',
      isAmharic: true,
      preferFemale,
    };
  }

  return {
    text: `Cartella ${number}`,
    lang: 'en-US',
    isAmharic: false,
    preferFemale,
  };
}
