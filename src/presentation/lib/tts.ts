import { formatAmharicBallCall } from '@/shared/tts/amharic-ball-call';
import { getBallCallSpeechParts } from '@/shared/tts/ball-call';
import { buildCartellaAnnouncement } from '@/shared/tts/voice-map';
import { playAmharicBall, playBallCallAudio } from './amharic-audio';
import { ipc } from './ipc';
import { isElectron } from '@/shared/runtime';

let queue: Promise<void> = Promise.resolve();

function waitForBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);

  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const onVoices = () => {
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

async function speakBrowser(text: string, lang: string, preferFemale: boolean): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const voices = await waitForBrowserVoices();
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = preferFemale ? 1.0 : 0.95;
    const voice = pickVoice(voices, lang, preferFemale);
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/** Play ball call — MP3 first (sharp sync), then Electron TTS, then browser speech. */
export async function speakBallCall(number: number, voiceType: string, language: string): Promise<void> {
  const preferFemale = voiceType.includes('FEMALE');
  const { letter, numberText } = getBallCallSpeechParts(number, language);

  if (await playBallCallAudio(number, language)) return;

  if (isElectron()) {
    const result = await ipc<{ success: boolean }>('tts:speak-ball-call', number, language, voiceType);
    if (result?.success) return;
  }

  if (language === 'am') {
    await speakBrowser(formatAmharicBallCall(number), 'am-ET', preferFemale);
    return;
  }

  if (letter) {
    await speakBrowser(`${letter} ${numberText}`, 'en-US', preferFemale);
    return;
  }

  await speakBrowser(numberText, 'en-US', preferFemale);
}

export function speakBall(number: number, voiceType: string, language: string): void {
  queue = queue.then(() => speakBallCall(number, voiceType, language));
}

export function speakCartella(number: number, voiceType: string, language: string): void {
  queue = queue.then(async () => {
    const payload = buildCartellaAnnouncement(number, voiceType, language);

    if (payload.isAmharic && await playAmharicBall(number)) {
      return;
    }

    if (isElectron()) {
      const result = await ipc<{ success: boolean }>('tts:speak', number, voiceType, language, 'cartella');
      if (result?.success) return;
    }

    await speakBrowser(payload.text, payload.lang, payload.preferFemale);
  });
}

export async function testVoice(voiceType: string, language: string, sample = 42): Promise<string> {
  const label = language === 'am'
    ? formatAmharicBallCall(sample)
    : `${getBallCallSpeechParts(sample, language).letter} ${sample}`;
  await speakBallCall(sample, voiceType, language);
  return `Ball call: "${label}"`;
}

export function loadVoices(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}
