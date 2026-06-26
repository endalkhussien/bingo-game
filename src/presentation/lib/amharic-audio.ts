import { getBallLetter } from '@/domain/services/bingo-engine';
import { formatAmharicBallCall, getBallCallAudioKey } from '@/shared/tts/amharic-ball-call';
import {
  allBallCallPaths,
  allGameEventPaths,
  computeBallCallPath,
  computeGameEventPath,
  computeGameEventPaths,
  BUNDLED_BALL_COUNT,
  type GameEventKey,
} from '@/shared/tts/bundled-audio-catalog';
import { DEFAULT_AMHARIC_VOICE } from '@/shared/tts/voice-packs';
import { isAmharicBundledVoice } from '@/shared/tts/amharic-voice';
import { isElectron } from '@/shared/runtime';
import { ipc } from '@/presentation/lib/ipc';

/** One queue for custom MP3s — events and ball calls play in order. */
let audioQueue: Promise<void> = Promise.resolve();
let stopGeneration = 0;
let currentAudio: HTMLAudioElement | null = null;

const READY_TIMEOUT_MS = 5000;
const PLAY_TIMEOUT_MS = 30000;
let audioUnlocked = false;

function buildMediaUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  if (typeof window !== 'undefined') {
    const origin = window.location?.origin;
    if (origin && origin !== 'null' && origin.startsWith('http')) {
      return `${origin}/${clean}`;
    }
  }
  if (isElectron()) {
    return `waliya-media://${clean}`;
  }
  return `/${clean}`;
}

function isHttpServedUi(): boolean {
  if (typeof window === 'undefined') return false;
  const origin = window.location?.origin;
  return Boolean(origin && origin !== 'null' && origin.startsWith('http'));
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const generation = stopGeneration;
  const next = audioQueue.then(async () => {
    if (generation !== stopGeneration) return false as T;
    return task();
  });
  audioQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function waitForCanPlay(audio: HTMLAudioElement, timeoutMs: number): Promise<boolean> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
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

function playUrl(url: string, generation: number): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (generation !== stopGeneration) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const audio = new Audio(url);
    audio.preload = 'auto';

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      if (currentAudio === audio) currentAudio = null;
      resolve(ok && generation === stopGeneration);
    };

    const safetyTimer = window.setTimeout(() => {
      audio.pause();
      finish(false);
    }, PLAY_TIMEOUT_MS);

    void (async () => {
      cancelBrowserSpeech();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      currentAudio = audio;

      const ready = await waitForCanPlay(audio, READY_TIMEOUT_MS);
      if (!ready) {
        finish(false);
        return;
      }

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);

      try {
        await audio.play();
      } catch {
        finish(false);
      }
    })();
  });
}

async function playPathsViaNativeIpc(relativePaths: string[]): Promise<boolean> {
  if (!isElectron()) return false;
  try {
    const result = await ipc<{ success?: boolean; error?: string }>('audio:play-paths', relativePaths);
    if (result?.success) return true;
    if (result?.error) {
      console.warn('[Waliya audio]', result.error);
    }
  } catch (err) {
    console.warn('[Waliya audio] native playback failed', err);
  }
  return false;
}

/** Play bundled clips — HTTP/waliya-media first, then Electron native player. */
export async function playRelativePathsDirect(relativePaths: string[]): Promise<boolean> {
  const generation = stopGeneration;
  if (generation !== stopGeneration) return false;

  if (isHttpServedUi()) {
    for (const relativePath of relativePaths) {
      if (generation !== stopGeneration) return false;
      if (await playUrl(buildMediaUrl(relativePath), generation)) return true;
    }
    if (generation !== stopGeneration) return false;
    return playPathsViaNativeIpc(relativePaths);
  }

  if (await playPathsViaNativeIpc(relativePaths)) return true;
  for (const relativePath of relativePaths) {
    if (generation !== stopGeneration) return false;
    if (await playUrl(buildMediaUrl(relativePath), generation)) return true;
  }
  return false;
}

async function playMp3Paths(relativePaths: string[]): Promise<boolean> {
  return playRelativePathsDirect(relativePaths);
}

function playGameEvent(event: GameEventKey): Promise<boolean> {
  return enqueue(() => playMp3Paths(computeGameEventPaths(event)));
}

export function cancelBrowserSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function warmClip(relativePath: string): void {
  if (typeof window === 'undefined') return;
  const audio = new Audio(buildMediaUrl(relativePath));
  audio.preload = 'auto';
  audio.load();
}

/** Warm browser cache for all ball + event clips (call on voice select / game start). */
export function preloadBallCallClips(_voiceType?: string): void {
  if (typeof window === 'undefined') return;
  const fromManifest = allBallCallPaths();
  if (fromManifest.length > 0) {
    for (const rel of fromManifest) warmClip(rel);
    return;
  }
  for (let n = 1; n <= BUNDLED_BALL_COUNT; n++) {
    warmClip(computeBallCallPath(n));
  }
}

export function preloadGameEventClips(_voiceType?: string): void {
  if (typeof window === 'undefined') return;
  for (const rel of allGameEventPaths()) warmClip(rel);
}

/** Prime browser audio after a user gesture so later clips can play reliably. */
export function unlockAudioPlayback(): void {
  if (typeof window === 'undefined' || audioUnlocked) return;
  audioUnlocked = true;
  const audio = new Audio(buildMediaUrl(computeGameEventPath('started')));
  const prevVolume = audio.volume;
  audio.volume = 0.001;
  void audio.play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = prevVolume;
    })
    .catch(() => undefined);
}

export function stopCurrentAudio(): void {
  stopGeneration += 1;
  cancelBrowserSpeech();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  audioQueue = Promise.resolve();
}

export function playBallCallClip(number: number, _voiceType: string): Promise<boolean> {
  warmClip(computeBallCallPath(number));
  return enqueue(() => playMp3Paths([computeBallCallPath(number)]));
}

export function playGameStartedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('started');
}

export function playGamePausedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('paused');
}

export function playGameStoppedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('stopped');
}

export function playGameContinuedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('continued');
}

export function playWinnerClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('winner');
}

export function playNotWinnerClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('notWinner');
}

export function playCartellaLockedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('cartellaLocked');
}

export function playShuffleClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEvent('shuffle');
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
