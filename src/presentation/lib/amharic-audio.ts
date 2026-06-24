import { getBallLetter } from '@/domain/services/bingo-engine';
import { formatAmharicBallCall, getBallCallAudioKey } from '@/shared/tts/amharic-ball-call';
import {
  ballCallClipCandidates,
  cartellaClipCandidates,
  eventClipCandidates,
  GAME_EVENT_CLIP_FILES,
} from '@/shared/tts/voice-packs';
import { isElectron } from '@/shared/runtime';

let currentAudio: HTMLAudioElement | null = null;

function buildMediaUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  if (isElectron()) {
    return `waliya-media://${clean}`;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location?.origin;
    if (origin && origin !== 'null' && origin.startsWith('http')) {
      return `${origin}/${clean}`;
    }
  }
  return `/${clean}`;
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
      audio.removeEventListener('error', onError);
      window.clearTimeout(timer);
      resolve(ok);
    };

    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), timeoutMs);

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

function playUrl(url: string, readyTimeoutMs = 2500): Promise<boolean> {
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
    }, 10000);

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

async function playFirstAvailable(relativePaths: string[], readyTimeoutMs = 2500): Promise<boolean> {
  for (const relativePath of relativePaths) {
    if (await playUrl(buildMediaUrl(relativePath), readyTimeoutMs)) return true;
  }
  return false;
}

/** Stop any MP3 and browser/system speech so clips never overlap TTS. */
export function cancelBrowserSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Warm browser cache for ball-call clips of one or all voice packs. */
export function preloadBallCallClips(voiceType?: string): void {
  if (typeof window === 'undefined') return;
  const voiceTypes = voiceType
    ? [voiceType]
    : ['AMHARIC_MALE', 'AMHARIC_MALE_2', 'AMHARIC_FEMALE', 'AMHARIC_FEMALE_2'];

  for (const vt of voiceTypes) {
    for (let n = 1; n <= 75; n++) {
      for (const rel of ballCallClipCandidates(n, vt)) {
        const audio = new Audio(buildMediaUrl(rel));
        audio.preload = 'auto';
        audio.load();
      }
    }
  }
}

/** Warm cache for game event clips. */
export function preloadGameEventClips(voiceType?: string): void {
  if (typeof window === 'undefined') return;
  const voiceTypes = voiceType
    ? [voiceType]
    : ['AMHARIC_MALE', 'AMHARIC_MALE_2', 'AMHARIC_FEMALE', 'AMHARIC_FEMALE_2'];
  const eventFiles = Object.values(GAME_EVENT_CLIP_FILES);

  for (const vt of voiceTypes) {
    for (const file of eventFiles) {
      for (const rel of eventClipCandidates(file, vt)) {
        const audio = new Audio(buildMediaUrl(rel));
        audio.preload = 'auto';
        audio.load();
      }
    }
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

export function playBallCallClip(number: number, voiceType: string): Promise<boolean> {
  return playFirstAvailable(ballCallClipCandidates(number, voiceType));
}

export function playCartellaClip(number: number, voiceType: string): Promise<boolean> {
  return playFirstAvailable(cartellaClipCandidates(number, voiceType));
}

export function playGameStartedClip(voiceType: string): Promise<boolean> {
  return playFirstAvailable(eventClipCandidates(GAME_EVENT_CLIP_FILES.started, voiceType), 5000);
}

export function playGameStoppedClip(voiceType: string): Promise<boolean> {
  return playFirstAvailable(eventClipCandidates(GAME_EVENT_CLIP_FILES.stopped, voiceType), 5000);
}

export function playGameContinuedClip(voiceType: string): Promise<boolean> {
  return playFirstAvailable(eventClipCandidates(GAME_EVENT_CLIP_FILES.continued, voiceType), 5000);
}

export function playWinnerClip(voiceType: string): Promise<boolean> {
  return playFirstAvailable(eventClipCandidates(GAME_EVENT_CLIP_FILES.winner, voiceType), 5000);
}

export function playNotWinnerClip(voiceType: string): Promise<boolean> {
  return playFirstAvailable(eventClipCandidates(GAME_EVENT_CLIP_FILES.notWinner, voiceType), 5000);
}

export function playCartellaLockedClip(voiceType: string): Promise<boolean> {
  return playFirstAvailable(eventClipCandidates(GAME_EVENT_CLIP_FILES.cartellaLocked, voiceType), 5000);
}

export async function playBallCallAudio(number: number, language: string, voiceType: string): Promise<boolean> {
  if (language === 'am') {
    return playBallCallClip(number, voiceType);
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
