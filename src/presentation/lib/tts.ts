import { buildAnnouncement } from '@/shared/tts/voice-map';
import { ipc, isElectron } from './ipc';

let voicesReady = false;
let queue: Promise<void> = Promise.resolve();

function waitForBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);

  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      voicesReady = true;
      resolve(existing);
      return;
    }
    const onVoices = () => {
      voicesReady = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    window.speechSynthesis.getVoices();
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      resolve(window.speechSynthesis.getVoices());
    }, 2000);
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string, preferFemale: boolean): SpeechSynthesisVoice | undefined {
  const prefix = lang.slice(0, 2);
  const langVoices = voices.filter((v) =>
    v.lang === lang || v.lang.startsWith(prefix) || v.lang.replace('_', '-').startsWith(prefix),
  );
  if (!langVoices.length) return undefined;
  if (preferFemale) {
    return langVoices.find((v) => /female|woman/i.test(v.name)) ?? langVoices[0];
  }
  return langVoices.find((v) => /male|man/i.test(v.name)) ?? langVoices[0];
}

async function speakBrowser(text: string, lang: string, preferFemale: boolean): Promise<boolean> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;

  const voices = await waitForBrowserVoices();
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = preferFemale ? 1.0 : 0.95;
    const voice = pickVoice(voices, lang, preferFemale);
    if (voice) u.voice = voice;
    u.onend = () => resolve(!!voice || true);
    u.onerror = () => resolve(false);
    window.speechSynthesis.speak(u);
  });
}

/** Speak drawn bingo number — Electron uses Windows SAPI / espeak-ng; browser uses Web Speech */
export function speakBall(number: number, voiceType: string, language: string): void {
  queue = queue.then(async () => {
    const payload = buildAnnouncement(number, voiceType, language);

    if (isElectron()) {
      const result = await ipc<{ success: boolean; engine?: string }>(
        'tts:speak', number, voiceType, language,
      );
      if (result?.success) return;
    }

    const ok = await speakBrowser(payload.text, payload.lang, payload.preferFemale);
    if (!ok && payload.isAmharic) {
      await speakBrowser(payload.text, 'en-US', payload.preferFemale);
    }
  });
}

export async function testVoice(voiceType: string, language: string, sample = 42): Promise<string> {
  if (isElectron()) {
    const result = await ipc<{ success: boolean; engine?: string; error?: string; text?: string }>(
      'tts:test', voiceType, language, sample,
    );
    if (result?.success) return `Spoken via ${result.engine}: "${result.text}"`;
    return result?.error ?? 'TTS failed';
  }
  speakBall(sample, voiceType, language);
  const p = buildAnnouncement(sample, voiceType, language);
  return `Browser TTS: "${p.text}"`;
}

export function loadVoices(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}
