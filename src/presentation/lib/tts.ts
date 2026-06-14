import { getBallLabel } from '@/domain/services/bingo-engine';

const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AMHARIC_TENS = ['', 'አስር', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠኝ'];

function toAmharic(n: number): string {
  if (n < 10) return AMHARIC_ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? AMHARIC_TENS[t] : `${AMHARIC_TENS[t]} ${AMHARIC_ONES[o]}`;
  }
  return String(n);
}

function buildText(number: number, voiceType: string, language: string): { text: string; lang: string } {
  const amharic = voiceType.startsWith('AMHARIC') || language === 'am';
  if (amharic) return { text: `ቁጥር ${toAmharic(number)}`, lang: 'am-ET' };
  const label = getBallLabel(number);
  const parts = label.split('-');
  const text = parts.length === 2 ? `${parts[0]} ${parts[1]}` : `Number ${number}`;
  return { text, lang: 'en-US' };
}

let queue: Promise<void> = Promise.resolve();

export function speakBall(number: number, voiceType: string, language: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const { text, lang } = buildText(number, voiceType, language);
  queue = queue.then(() => new Promise<void>((resolve) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = voiceType.includes('FEMALE') ? 1.05 : 0.95;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang.startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  }));
}

export function loadVoices(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}
