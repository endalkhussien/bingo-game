import { DEFAULT_AMHARIC_VOICE } from './voice-packs';

/** True when game should play bundled MP3s from public/audio/ (not English TTS). */
export function isAmharicBundledVoice(voiceType: string, language?: string): boolean {
  if (voiceType === DEFAULT_AMHARIC_VOICE) return true;
  const lang = normalizeGameLanguage(language);
  return lang === 'am' && voiceType !== 'ENGLISH';
}

export function normalizeGameLanguage(language?: string): 'am' | 'en' {
  if (!language) return 'am';
  return language.toLowerCase().startsWith('am') ? 'am' : 'en';
}
