import { buildCartellaAnnouncement } from '@/shared/tts/voice-map';
import { getBallCallSpeechParts } from '@/shared/tts/ball-call';
import { playAmharicBall, playBallCallAudio, playEnglishBingoLetter } from './amharic-audio';
import { ipc, isElectron } from './ipc';
import { DRAW_BALL_COUNT } from '@/shared/brand';

let voicesReady = false;
let queue: Promise<void> = Promise.resolve();

type SpeakMode = 'ball' | 'cartella';

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
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = preferFemale ? 1.0 : 0.95;
    const voice = pickVoice(voices, lang, preferFemale);
    if (voice) u.voice = voice;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    window.speechSynthesis.speak(u);
  });
}

async function speakBallCall(number: number, voiceType: string, language: string): Promise<void> {
  const preferFemale = voiceType.includes('FEMALE');
  const { letter, numberText, numberLang } = getBallCallSpeechParts(number, language);

  if (isElectron()) {
    const result = await ipc<{ success: boolean }>('tts:speak-ball-call', number, language, voiceType);
    if (result?.success) return;
  }

  if (number <= DRAW_BALL_COUNT && await playBallCallAudio(number, language)) {
    if (language === 'en') {
      await speakBrowser(numberText, 'en-US', preferFemale);
    }
    return;
  }

  if (letter) {
    const letterOk = await playEnglishBingoLetter(letter);
    if (!letterOk) await speakBrowser(letter, 'en-US', preferFemale);
  }

  if (language === 'am') {
    if (!(await playAmharicBall(number))) {
      await speakBrowser(numberText, numberLang, preferFemale);
    }
  } else {
    await speakBrowser(numberText, 'en-US', preferFemale);
  }
}

export function speakBall(number: number, voiceType: string, language: string): void {
  enqueueSpeak(number, voiceType, language, 'ball');
}

export function speakCartella(number: number, voiceType: string, language: string): void {
  enqueueSpeak(number, voiceType, language, 'cartella');
}

function enqueueSpeak(number: number, voiceType: string, language: string, mode: SpeakMode): void {
  queue = queue.then(async () => {
    if (mode === 'ball') {
      await speakBallCall(number, voiceType, language);
      return;
    }

    const payload = buildCartellaAnnouncement(number, voiceType, language);
    if (payload.isAmharic && number <= DRAW_BALL_COUNT && await playAmharicBall(number)) {
      return;
    }

    if (isElectron()) {
      const result = await ipc<{ success: boolean }>('tts:speak', number, voiceType, language, mode);
      if (result?.success) return;
    }

    const ok = await speakBrowser(payload.text, payload.lang, payload.preferFemale);
    if (!ok && payload.isAmharic) {
      await speakBrowser(payload.text, 'en-US', payload.preferFemale);
    }
  });
}

export async function testVoice(voiceType: string, language: string, sample = 42): Promise<string> {
  const { letter, numberText } = getBallCallSpeechParts(sample, language);
  const label = `${letter} ${numberText}`;

  if (isElectron()) {
    const result = await ipc<{ success: boolean; engine?: string; error?: string }>(
      'tts:speak-ball-call', sample, language, voiceType,
    );
    if (result?.success) return `Spoken via ${result.engine}: "${label}"`;
    return result?.error ?? 'TTS failed';
  }

  speakBall(sample, voiceType, language);
  return `Ball call: "${label}" (English letter, then ${language === 'am' ? 'Amharic' : 'English'} number)`;
}

export function loadVoices(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}
