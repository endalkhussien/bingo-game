import { formatAmharicBallCall } from '@/shared/tts/amharic-ball-call';
import { isAmharicBundledVoice } from '@/shared/tts/amharic-voice';
import { DEFAULT_AMHARIC_VOICE } from '@/shared/tts/voice-packs';
import { getBallCallSpeechParts } from '@/shared/tts/ball-call';
import { buildCartellaAnnouncement, buildGameStartedAnnouncement } from '@/shared/tts/voice-map';
import { playBallCallAudio, playCartellaClip, playGameStartedClip, playGameContinuedClip, playShuffleClip } from './amharic-audio';
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

/** Play ball call — Amharic Male 1 uses bundled MP3 from public/audio/. */
export async function speakBallCall(number: number, voiceType: string, language: string): Promise<boolean> {
  if (isAmharicBundledVoice(voiceType, language)) {
    return playBallCallAudio(number, language, DEFAULT_AMHARIC_VOICE);
  }

  const preferFemale = voiceType.includes('FEMALE');
  const { letter, numberText } = getBallCallSpeechParts(number, language);

  if (await playBallCallAudio(number, language, voiceType)) return true;

  if (isElectron()) {
    try {
      const result = await ipc<{ success: boolean }>('tts:speak-ball-call', number, language, voiceType);
      if (result?.success) return true;
    } catch {
      // fall through
    }
  }

  if (letter) {
    return speakBrowser(`${letter} ${numberText}`, 'en-US', preferFemale);
  }

  return speakBrowser(numberText, 'en-US', preferFemale);
}

export function speakCartella(number: number, voiceType: string, language: string): void {
  queue = queue.then(async () => {
    if (isAmharicBundledVoice(voiceType, language)) {
      if (await playCartellaClip(number, DEFAULT_AMHARIC_VOICE)) return;
      if (isElectron()) {
        const result = await ipc<{ success: boolean }>('tts:speak', number, voiceType, language, 'cartella');
        if (result?.success) return;
      }
      const payload = buildCartellaAnnouncement(number, voiceType, language);
      await speakBrowser(payload.text, payload.lang, payload.preferFemale);
      return;
    }

    if (isElectron()) {
      const result = await ipc<{ success: boolean }>('tts:speak', number, voiceType, language, 'cartella');
      if (result?.success) return;
    }

    const payload = buildCartellaAnnouncement(number, voiceType, language);
    await speakBrowser(payload.text, payload.lang, payload.preferFemale);
  });
}

/** Speak arbitrary announcement text (English / non-Amharic only). */
export async function speakPlainText(text: string, lang: string, voiceType: string): Promise<void> {
  if (lang.startsWith('am')) return;

  const preferFemale = voiceType.includes('FEMALE');
  if (isElectron()) {
    const result = await ipc<{ success: boolean }>('tts:speak-text', text, lang, voiceType);
    if (result?.success) return;
  }
  await speakBrowser(text, lang, preferFemale);
}

/** Announce game start — Amharic Male 1 uses game_started.mp3 from public/audio/. */
export async function speakGameStarted(voiceType: string, language: string): Promise<void> {
  if (isAmharicBundledVoice(voiceType, language)) {
    const played = await playGameStartedClip(voiceType, language);
    if (!played) {
      await playGameContinuedClip(voiceType, language);
    }
    return;
  }
  const payload = buildGameStartedAnnouncement(language, voiceType);
  await speakPlainText(payload.text, payload.lang, voiceType);
}

/** Cartella shuffle — Amharic Male 1 uses shuffle.mp3; grid order stays fixed. */
export function speakShuffle(voiceType: string, language: string): void {
  if (!isAmharicBundledVoice(voiceType, language)) return;
  void playShuffleClip(voiceType, language);
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
