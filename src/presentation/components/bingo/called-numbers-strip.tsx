'use client';

import { getBallLabel } from '@/domain/services/bingo-engine';
import { formatBallCallLabel } from '@/shared/tts/ball-call';
import { cn } from '@/presentation/lib/utils';

interface CalledNumbersStripProps {
  called: number[];
  lastDrawn: number | null;
  maxBalls: number;
  language: string;
}

export function CalledNumbersStrip({ called, lastDrawn, maxBalls, language }: CalledNumbersStripProps) {
  const recent = [...called].slice(-12).reverse();

  if (called.length === 0) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-6 text-center text-sm text-indigo-700">
        Press <strong>Start</strong> to begin calling numbers 1–{maxBalls}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">
          Called numbers <span className="text-indigo-600">({called.length}/{maxBalls})</span>
        </p>
        {lastDrawn !== null && (
          <p className="text-xs text-gray-500">
            Latest: <span className="font-bold text-indigo-700">{formatBallCallLabel(lastDrawn, language)}</span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((n) => (
          <div
            key={`${n}-${called.indexOf(n)}`}
            className={cn(
              'flex min-w-[3.25rem] flex-col items-center rounded-lg px-2 py-1.5 text-center',
              n === lastDrawn ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-800',
            )}
          >
            <span className="text-xs font-bold leading-none">{getBallLabel(n).replace('-', '')}</span>
            <span className={cn('mt-0.5 text-[10px] leading-tight', n === lastDrawn ? 'text-indigo-100' : 'text-gray-500')}>
              {n}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
