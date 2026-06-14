import { DRAW_BALL_COUNT } from '../../shared/brand';
import { getBallLabel, getBallLetter } from './bingo-engine';

export interface CallRecord {
  number: number;
  letter: string;
  label: string;
  drawOrder: number;
  calledAt: number;
}

export interface CallingEngineState {
  calledNumbers: number[];
  remainingNumbers: number[];
  history: CallRecord[];
  drawCount: number;
  remainingCount: number;
  maxBalls: number;
  isComplete: boolean;
}

function buildRemaining(called: Set<number>, max: number): number[] {
  const remaining: number[] = [];
  for (let n = 1; n <= max; n++) {
    if (!called.has(n)) remaining.push(n);
  }
  return remaining;
}

/** Random 1–75 draw engine with duplicate prevention, history, and reset. */
export class CallingEngine {
  private readonly max: number;
  private called = new Set<number>();
  private history: CallRecord[] = [];

  constructor(max = DRAW_BALL_COUNT) {
    this.max = max;
  }

  get drawCount(): number {
    return this.history.length;
  }

  get isComplete(): boolean {
    return this.called.size >= this.max;
  }

  get calledNumbers(): number[] {
    return this.history.map((h) => h.number);
  }

  get remainingNumbers(): number[] {
    return buildRemaining(this.called, this.max);
  }

  get callHistory(): CallRecord[] {
    return [...this.history];
  }

  hasBeenCalled(number: number): boolean {
    return this.called.has(number);
  }

  /** Restore state from persisted draws (e.g. after page reload). */
  loadFromHistory(
    numbers: number[],
    timestamps?: Array<number | undefined>,
  ): void {
    this.reset();
    numbers.forEach((number, index) => {
      if (number < 1 || number > this.max || this.called.has(number)) return;
      const calledAt = timestamps?.[index] ?? Date.now();
      this.record(number, calledAt);
    });
  }

  draw(now = Date.now()): CallRecord {
    if (this.isComplete) {
      throw new Error('All numbers have been drawn');
    }

    const remaining = this.remainingNumbers;
    const number = remaining[Math.floor(Math.random() * remaining.length)];
    return this.record(number, now);
  }

  reset(): void {
    this.called.clear();
    this.history = [];
  }

  snapshot(): CallingEngineState {
    return {
      calledNumbers: this.calledNumbers,
      remainingNumbers: this.remainingNumbers,
      history: this.callHistory,
      drawCount: this.drawCount,
      remainingCount: this.remainingNumbers.length,
      maxBalls: this.max,
      isComplete: this.isComplete,
    };
  }

  private record(number: number, calledAt: number): CallRecord {
    const drawOrder = this.history.length + 1;
    const record: CallRecord = {
      number,
      letter: getBallLetter(number),
      label: getBallLabel(number),
      drawOrder,
      calledAt,
    };
    this.called.add(number);
    this.history.push(record);
    return record;
  }
}

/** Stateless draw helper used by legacy callers. */
export function drawRandomNumber(alreadyDrawn: number[], max = DRAW_BALL_COUNT): number {
  const engine = new CallingEngine(max);
  engine.loadFromHistory(alreadyDrawn);
  return engine.draw().number;
}
