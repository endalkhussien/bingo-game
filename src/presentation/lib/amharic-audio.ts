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

const READY_TIMEOUT_MS = 8000;
const PLAY_TIMEOUT_MS = 45000;

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

function isHttpServedUi(): boolean {
  if (typeof window === 'undefined') return false;
  const origin = window.location?.origin;
  return Boolean(origin && origin !== 'null' && origin.startsWith('http'));
}

function warnAudio(message: string, relativePaths: string[]): void {
  if (typeof console === 'undefined') return;
  console.warn('[Waliya audio]', message, relativePaths.join(' | '));
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

function playUrl(url: string, generation: number, relativePath: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (generation !== stopGeneration) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const audio = new Audio(url);
    audio.preload = 'auto';

    const finish = (ok: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      if (currentAudio === audio) currentAudio = null;
      if (!ok) warnAudio(reason ?? 'HTML playback failed', [relativePath]);
      resolve(ok && generation === stopGeneration);
    };

    const safetyTimer = window.setTimeout(() => {
      audio.pause();
      finish(false, 'HTML playback timed out');
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
        finish(false, `Could not load ${relativePath} from ${url}`);
        return;
      }

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false, `Error playing ${relativePath}`);

      try {
        await audio.play();
      } catch (err) {
        finish(false, `Browser blocked play() for ${relativePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  });
}

async function playPathsViaNativeIpc(relativePaths: string[]): Promise<boolean> {
  if (!isElectron()) return false;
  try {
    const result = await ipc<{ success?: boolean; error?: string }>('audio:play-paths', relativePaths);
    if (result?.success) return true;
    if (result?.error) warnAudio(result.error, relativePaths);
  } catch (err) {
    warnAudio(`Native playback failed: ${err instanceof Error ? err.message : String(err)}`, relativePaths);
  }
  return false;
}

/** Play bundled clips — Electron native player first, then HTTP / waliya-media. */
export async function playRelativePathsDirect(relativePaths: string[]): Promise<boolean> {
  const generation = stopGeneration;
  if (generation !== stopGeneration) return false;
  if (!relativePaths.length) return false;

  if (isElectron()) {
    if (await playPathsViaNativeIpc(relativePaths)) return true;
  }

  for (const relativePath of relativePaths) {
    if (generation !== stopGeneration) return false;
    const url = buildMediaUrl(relativePath);
    if (await playUrl(url, generation, relativePath)) return true;
  }

  warnAudio(
    'No clip played — check public/audio/ file names (run npm run audio:map) and npm run setup:audio',
    relativePaths,
  );
  return false;
}

async function playMp3Paths(relativePaths: string[]): Promise<boolean> {
  return playRelativePathsDirect(relativePaths);
}

/** Button/event clips — play immediately on click, interrupt any ball call. */
function playGameEventImmediate(event: GameEventKey): Promise<boolean> {
  stopCurrentAudio();
  return playMp3Paths(computeGameEventPaths(event));
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

/** Mark audio ready after a user click — no silent/muted playback. */
export function unlockAudioPlayback(): void {
  // Intentionally empty — Electron allows autoplay; user clicks Play to start voice.
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
  const relativePath = computeBallCallPath(number);
  warmClip(relativePath);
  return enqueue(() => playMp3Paths([relativePath]));
}

export function playGameStartedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('started');
}

export function playGamePausedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('paused');
}

export function playGameStoppedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('stopped');
}

export function playGameContinuedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('continued');
}

export function playWinnerClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('winner');
}

export function playNotWinnerClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('notWinner');
}

export function playCartellaLockedClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('cartellaLocked');
}

export function playShuffleClip(voiceType: string, language?: string): Promise<boolean> {
  if (!isAmharicBundledVoice(voiceType, language)) return Promise.resolve(false);
  return playGameEventImmediate('shuffle');
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

export function describeBallCallFile(number: number): string {
  return `public/audio/${getBallCallAudioKey(number)}.mp3`;
}

export { formatAmharicBallCall, getBallCallAudioKey };
