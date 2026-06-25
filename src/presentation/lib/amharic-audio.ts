import { getBallLetter } from '@/domain/services/bingo-engine';
import { formatAmharicBallCall, getBallCallAudioKey } from '@/shared/tts/amharic-ball-call';
import {
  allBallCallPaths,
  allGameEventPaths,
  computeBallCallPath,
  computeCartellaPaths,
  computeGameEventPath,
  type GameEventKey,
} from '@/shared/tts/bundled-audio-catalog';
import { DEFAULT_AMHARIC_VOICE } from '@/shared/tts/voice-packs';
import { isAmharicBundledVoice } from '@/shared/tts/amharic-voice';
import { isElectron } from '@/shared/runtime';
import { ipc } from '@/presentation/lib/ipc';

let currentAudio: HTMLAudioElement | null = null;
const clipCache = new Map<string, HTMLAudioElement>();

const CACHED_READY_MS = 400;
const UNCACHED_READY_MS = 2500;

function buildMediaUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  if (typeof window !== 'undefined') {
    const origin = window.location?.origin;
    if (origin && origin !== 'null' && origin.startsWith('http')) {
      return `${origin}/${clean}`;
    }
  }
  if (isElectron()) {
    return `waliya-media:///${clean}`;
  }
  return `/${clean}`;
}

/** True when UI is served over HTTP (Next dev server or embedded static server). */
function isHttpServedUi(): boolean {
  if (typeof window === 'undefined') return false;
  const origin = window.location?.origin;
  return Boolean(origin && origin !== 'null' && origin.startsWith('http'));
}

function warmClip(relativePath: string): HTMLAudioElement {
  const url = buildMediaUrl(relativePath);
  let audio = clipCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    clipCache.set(url, audio);
    audio.load();
  }
  return audio;
}

async function playPathsViaNativeIpc(relativePaths: string[]): Promise<boolean> {
  if (!isElectron()) return false;
  try {
    const result = await ipc<{ success: boolean; error?: string }>('audio:play-paths', relativePaths);
    if (result?.success) return true;
    if (result?.error) {
      console.warn('[Waliya audio]', result.error);
    }
  } catch (err) {
    console.warn('[Waliya audio] native playback failed', err);
  }
  return false;
}

function waitForCanPlay(audio: HTMLAudioElement, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve(true);
      return;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onError);
      window.clearTimeout(timer);
      resolve(ok);
    };

    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), timeoutMs);

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

function playCachedClip(url: string, readyTimeoutMs = CACHED_READY_MS): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    let audio = clipCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = 'auto';
      clipCache.set(url, audio);
    }

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      window.clearTimeout(readyTimer);
      audio!.removeEventListener('loadeddata', onReady);
      audio!.removeEventListener('canplay', onReady);
      audio!.removeEventListener('canplaythrough', onReady);
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };

    const safetyTimer = window.setTimeout(() => {
      audio!.pause();
      finish(false);
    }, 20000);

    let readyTimer = 0;
    const onReady = () => {
      void startPlayback();
    };

    const startPlayback = async () => {
      try {
        cancelBrowserSpeech();
        if (currentAudio && currentAudio !== audio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = audio!;
        audio!.onended = () => finish(true);
        audio!.onerror = () => finish(false);
        audio!.currentTime = 0;
        await audio!.play();
      } catch {
        finish(false);
      }
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      void startPlayback();
      return;
    }

    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.load();
    readyTimer = window.setTimeout(() => finish(false), readyTimeoutMs);
  });
}

function playUrl(url: string, readyTimeoutMs = UNCACHED_READY_MS): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const audio = new Audio(url);
    audio.preload = 'auto';

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };

    const safetyTimer = window.setTimeout(() => {
      audio.pause();
      settle(false);
    }, 20000);

    void (async () => {
      try {
        cancelBrowserSpeech();
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = audio;

        const ready = await waitForCanPlay(audio, readyTimeoutMs);
        if (!ready) {
          settle(false);
          return;
        }

        audio.onended = () => settle(true);
        audio.onerror = () => settle(false);

        await audio.play();
      } catch {
        settle(false);
      }
    })();
  });
}

async function playRelativePaths(relativePaths: string[], readyTimeoutMs = UNCACHED_READY_MS): Promise<boolean> {
  for (const relativePath of relativePaths) {
    warmClip(relativePath);
    const url = buildMediaUrl(relativePath);
    const cachedReadyMs = clipCache.has(url) ? CACHED_READY_MS : readyTimeoutMs;

    if (isHttpServedUi()) {
      if (await playCachedClip(url, cachedReadyMs)) return true;
      if (await playUrl(url, readyTimeoutMs)) return true;
      continue;
    }

    if (await playCachedClip(url, cachedReadyMs)) return true;
    if (await playUrl(url, readyTimeoutMs)) return true;
  }

  if (await playPathsViaNativeIpc(relativePaths)) return true;
  return false;
}

async function playGameEventClip(event: GameEventKey): Promise<boolean> {
  const relativePath = computeGameEventPath(event);
  warmClip(relativePath);
  const url = buildMediaUrl(relativePath);

  if (isHttpServedUi()) {
    if (await playCachedClip(url)) return true;
    if (await playRelativePaths([relativePath], 8000)) return true;
    return playPathsViaNativeIpc([relativePath]);
  }
  if (isElectron()) {
    return playRelativePaths([relativePath], 8000);
  }
  if (await playCachedClip(url)) return true;
  return playRelativePaths([relativePath], 5000);
}

export function cancelBrowserSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Preload all ball-call clips listed in the audio manifest (public/audio/). */
export function preloadBallCallClips(_voiceType?: string): void {
  if (typeof window === 'undefined') return;
  for (const rel of allBallCallPaths()) {
    warmClip(rel);
  }
}

/** Preload all game event clips from public/audio/. */
export function preloadGameEventClips(_voiceType?: string): void {
  if (typeof window === 'undefined') return;
  for (const rel of allGameEventPaths()) {
    warmClip(rel);
  }
}

export function stopCurrentAudio(): void {
  cancelBrowserSpeech();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/** Play bundled ball call — computes path from number, e.g. 42 → audio/G42.mp3 */
export function playBallCallClip(number: number, _voiceType: string): Promise<boolean> {
  const relativePath = computeBallCallPath(number);
  warmClip(relativePath);
  return playRelativePaths([relativePath], CACHED_READY_MS);
}

export function playCartellaClip(number: number, voiceType: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, 'am')) return Promise.resolve(false);
  for (const rel of computeCartellaPaths(number)) warmClip(rel);
  return playRelativePaths(computeCartellaPaths(number), CACHED_READY_MS);
}

export function playGameStartedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventClip('started');
}

export function playGameStoppedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventClip('stopped');
}

export function playGameContinuedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventClip('continued');
}

export function playWinnerClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventClip('winner');
}

export function playNotWinnerClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventClip('notWinner');
}

export function playCartellaLockedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventClip('cartellaLocked');
}

export function playShuffleClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventClip('shuffle');
}

export async function playBallCallAudio(number: number, language: string, voiceType: string): Promise<boolean> {
  if (isAmharicBundledVoice(voiceType, language)) {
    return playBallCallClip(number, DEFAULT_AMHARIC_VOICE);
  }

  const letter = getBallLetter(number);
  if (!letter) return false;

  return speakEnglishLetterBrowser(letter);
}

async function speakEnglishLetterBrowser(letter: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(letter);
    u.lang = 'en-US';
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    window.speechSynthesis.speak(u);
  });
}

export function getBallCallDisplayText(number: number, language: string): string {
  if (language === 'am') return formatAmharicBallCall(number);
  const letter = getBallLetter(number);
  return letter ? `${letter} ${number}` : String(number);
}

export { formatAmharicBallCall, getBallCallAudioKey };
