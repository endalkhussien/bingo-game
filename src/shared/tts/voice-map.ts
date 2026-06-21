const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AMHARIC_TENS = ['', 'አስር', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠኝ'];

/** Teens 10–19 use አስራ + ones (not አስር + ones). */
const AMHARIC_TEENS: Record<number, string> = {
  10: 'አስር',
  11: 'አስራ አንድ',
  12: 'አስራ ሁለት',
  13: 'አስራ ሶስት',
  14: 'አስራ አራት',
  15: 'አስራ አምስት',
  16: 'አስራ ስድስት',
  17: 'አስራ ሰባት',
  18: 'አስራ ስምንት',
  19: 'አስራ ዘጠኝ',
};

function toAmharicNumber(n: number): string {
  if (n <= 0) return String(n);
  if (n >= 10 && n <= 19) return AMHARIC_TEENS[n];
  if (n < 10) return AMHARIC_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) return AMHARIC_TENS[tens];
    return `${AMHARIC_TENS[tens]} ${AMHARIC_ONES[ones]}`;
  }
  if (n === 100) return 'መቶ';
  if (n <= 500) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const hundredWord = hundreds === 1 ? 'መቶ' : `${AMHARIC_ONES[hundreds]} መቶ`;
    if (rest === 0) return hundredWord;
    return `${hundredWord} ${toAmharicNumber(rest)}`;
  }
  return String(n);
}

export function toAmharicNumberWord(n: number): string {
  return toAmharicNumber(n);
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

/** Spoken once when the agent presses Start to begin calling */
export function buildGameStartedAnnouncement(
  language: string,
  voiceType: string,
): { text: string; lang: string; preferFemale: boolean } {
  const preferFemale = voiceType.includes('FEMALE');
  if (language === 'am') {
    return { text: 'ጨዋታ ጀመረች', lang: 'am-ET', preferFemale };
  }
  return { text: 'Game has started', lang: 'en-US', preferFemale };
}
