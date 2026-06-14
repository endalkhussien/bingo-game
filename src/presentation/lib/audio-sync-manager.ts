export type AudioSyncEvent = 'lock' | 'unlock' | 'audio-start' | 'audio-end' | 'cooldown-start' | 'cooldown-end';

export interface AudioSyncManagerOptions {
  /** Delay after audio finishes before the next call (default 3000ms). */
  cooldownMs?: number;
  onEvent?: (event: AudioSyncEvent) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensures ball calls never overlap: play audio → wait until finished → cooldown → unlock.
 */
export class AudioSyncManager {
  private locked = false;
  private cooldownMs: number;
  private readonly onEvent?: (event: AudioSyncEvent) => void;

  constructor(options: AudioSyncManagerOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? 500;
    this.onEvent = options.onEvent;
  }

  isLocked(): boolean {
    return this.locked;
  }

  getCooldownMs(): number {
    return this.cooldownMs;
  }

  setCooldownMs(ms: number): void {
    this.cooldownMs = Math.max(0, ms);
  }

  private emit(event: AudioSyncEvent): void {
    this.onEvent?.(event);
  }

  /**
   * Synchronized call pipeline:
   * lock → play audio → wait for finish → cooldown → unlock
   */
  async callNumber(
    number: number,
    playAudio: (n: number) => Promise<void>,
    cooldownMs?: number,
  ): Promise<void> {
    if (this.locked) return;

    this.locked = true;
    this.emit('lock');

    try {
      this.emit('audio-start');
      await playAudio(number);
      this.emit('audio-end');

      const waitMs = cooldownMs ?? this.cooldownMs;
      if (waitMs > 0) {
        this.emit('cooldown-start');
        await delay(waitMs);
        this.emit('cooldown-end');
      }
    } finally {
      this.locked = false;
      this.emit('unlock');
    }
  }
}

export interface DrawResult {
  number: number;
  drawOrder?: number;
  drawnAt?: number;
}

export interface GameCallerOptions {
  cooldownMs: number;
  voiceType: string;
  language: string;
  isPaused: () => boolean;
  shouldContinue: () => boolean;
  drawNumber: () => Promise<DrawResult | null>;
  onDraw: (result: DrawResult) => void;
  playAudio: (number: number, voiceType: string, language: string) => Promise<void>;
}

/**
 * Auto-call loop: draws only when unlocked, speaks each ball, then waits cooldown.
 */
export async function runAutoCallLoop(
  syncManager: AudioSyncManager,
  options: GameCallerOptions,
): Promise<void> {
  syncManager.setCooldownMs(options.cooldownMs);

  while (options.shouldContinue() && !options.isPaused()) {
    if (syncManager.isLocked()) {
      await delay(50);
      continue;
    }

    const drawn = await options.drawNumber();
    if (!drawn || !options.shouldContinue()) break;

    options.onDraw(drawn);

    await syncManager.callNumber(
      drawn.number,
      (n) => options.playAudio(n, options.voiceType, options.language),
      options.cooldownMs,
    );
  }
}
