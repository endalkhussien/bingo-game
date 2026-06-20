/** Shared Amharic number words for audio scripts (keep in sync with voice-map.ts). */

export const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
export const AMHARIC_TENS = ['', 'አስር', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠኝ'];
export const AMHARIC_TEENS = {
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

export function toAmharicNumber(n) {
  if (n <= 0 || !Number.isFinite(n)) return String(n);
  if (n >= 10 && n <= 19) return AMHARIC_TEENS[n];
  if (n < 10) return AMHARIC_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) return AMHARIC_TENS[tens];
    return `${AMHARIC_TENS[tens]} ${AMHARIC_ONES[ones]}`;
  }
  if (n <= 500) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const hundredWord = hundreds === 1 ? 'መቶ' : `${AMHARIC_ONES[hundreds]} መቶ`;
    if (rest === 0) return hundredWord;
    return `${hundredWord} ${toAmharicNumber(rest)}`;
  }
  return String(n);
}

export function formatCartellaPhrase(n) {
  return `ካርቴላ ${toAmharicNumber(n)}`;
}
