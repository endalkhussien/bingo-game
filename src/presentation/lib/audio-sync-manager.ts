import { stopCurrentAudio } from './amharic-audio';
import { DEFAULT_CALL_COOLDOWN_MS } from '@/shared/constants';

export type AudioSyncEvent = 'lock' | 'unlock' | 'audio-start' | 'audio-end' | 'cooldown-start' | 'cooldown-end' | 'abort';

export interface AudioSyncManagerOptions {
  cooldownMs?: number;
  onEvent?: (event: AudioSyncEvent) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function abortableDelay(ms: number, isAborted: () => boolean): Promise<void> {
  if (ms <= 0) return;
  const step = 25;
  let elapsed = 0;
  while (elapsed < ms && !isAborted()) {
    const chunk = Math.min(step, ms - elapsed);
    await delay(chunk);
    elapsed += chunk;
  }
}

export class AudioSyncManager {
  private locked = false;
  private aborted = false;
  private cooldownMs: number;
  private readonly onEvent?: (event: AudioSyncEvent) => void;

  constructor(options: AudioSyncManagerOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? DEFAULT_CALL_COOLDOWN_MS;
    this.onEvent = options.onEvent;
  }

  isLocked(): boolean {
    return this.locked;
  }

  isAborted(): boolean {
    return this.aborted;
  }

  getCooldownMs(): number {
    return this.cooldownMs;
  }

  setCooldownMs(ms: number): void {
    this.cooldownMs = Math.max(0, ms);
  }

  /** Stop the auto-call loop without cancelling queued voice clips. */
  cancelLoop(): void {
    this.aborted = true;
    this.locked = false;
    this.emit('abort');
    this.emit('unlock');
  }

  abort(): void {
    this.cancelLoop();
    stopCurrentAudio();
  }

  private emit(event: AudioSyncEvent): void {
    this.onEvent?.(event);
  }

  async callNumber(
    number: number,
    playAudio: (n: number) => Promise<boolean>,
    cooldownMs?: number,
  ): Promise<void> {
    this.aborted = false;
    this.locked = true;
    this.emit('lock');

    try {
      if (this.aborted) return;

      this.emit('audio-start');
      const paceMs = cooldownMs ?? this.cooldownMs;
      const cycleStart = Date.now();
      await playAudio(number);
      if (this.aborted) return;
      this.emit('audio-end');

      const remaining = Math.max(0, paceMs - (Date.now() - cycleStart));
      if (remaining > 0 && !this.aborted) {
        this.emit('cooldown-start');
        await abortableDelay(remaining, () => this.aborted);
        if (!this.aborted) this.emit('cooldown-end');
      }
    } finally {
      this.locked = false;
      if (!this.aborted) this.emit('unlock');
    }
  }
}

export interface DrawResult {
  number: number;
  drawOrder?: number;
  drawnAt?: number;
  voiceType?: string;
  language?: string;
}

export interface GameCallerOptions {
  cooldownMs: number;
  voiceType: string;
  language: string;
  isPaused: () => boolean;
  shouldContinue: () => boolean;
  drawNumber: () => Promise<DrawResult | null>;
  onDraw: (result: DrawResult) => void;
  playAudio: (number: number, voiceType: string, language: string) => Promise<boolean>;
}

export async function runAutoCallLoop(
  syncManager: AudioSyncManager,
  options: GameCallerOptions,
): Promise<void> {
  syncManager.setCooldownMs(options.cooldownMs);

  while (options.shouldContinue() && !options.isPaused()) {
    const drawn = await options.drawNumber();
    if (!drawn || !options.shouldContinue() || options.isPaused()) break;

    if (!options.shouldContinue() || options.isPaused()) break;

    const v = drawn.voiceType ?? options.voiceType;
    const l = drawn.language ?? options.language;

    await syncManager.callNumber(
      drawn.number,
      async (n) => {
        const audioPromise = options.playAudio(n, v, l);
        options.onDraw(drawn);
        return audioPromise;
      },
      options.cooldownMs,
    );

    if (!options.shouldContinue() || options.isPaused()) break;
  }
}
