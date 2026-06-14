'use client';

import { X } from 'lucide-react';
import {
  BINGO_COLUMNS,
  BINGO_COLUMN_COLORS,
  COLUMN_RANGES,
} from '@/shared/constants';
import { DRAW_BALL_COUNT } from '@/shared/brand';
import { getBallLabel } from '@/domain/services/bingo-engine';
import { toAmharicNumberWord } from '@/shared/tts/voice-map';
import { cn } from '@/presentation/lib/utils';

interface CalledNumbersModalProps {
  open: boolean;
  onClose: () => void;
  called: number[];
  lastDrawn: number | null;
  maxBalls?: number;
  language?: string;
}

export function CalledNumbersModal({
  open,
  onClose,
  called,
  lastDrawn,
  maxBalls = DRAW_BALL_COUNT,
  language = 'am',
}: CalledNumbersModalProps) {
  if (!open) return null;

  const calledSet = new Set(called);
  const recent = [...called].slice(-10).reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 text-white">
          <div>
            <h2 className="text-xl font-bold">Called Numbers</h2>
            <p className="text-sm text-white/70">Balls drawn this game — separate from cartella selection</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">
              {called.length}/{maxBalls}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {lastDrawn !== null && (
          <div className="flex items-center justify-center gap-4 border-b bg-indigo-50 px-5 py-4">
            <p className="text-sm font-medium text-indigo-900">Latest call</p>
            <div className="flex h-16 min-w-[5rem] flex-col items-center justify-center rounded-full bg-indigo-600 px-3 text-white shadow-lg ring-4 ring-indigo-200">
              <span className="text-xl font-black leading-none">{getBallLabel(lastDrawn).replace('-', ' ')}</span>
            </div>
            {language === 'am' && (
              <p className="text-sm font-medium text-indigo-800">{toAmharicNumberWord(lastDrawn)}</p>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <div className="border-b px-5 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent calls</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((n, i) => (
                <span
                  key={`${n}-${i}`}
                  className={cn(
                    'inline-flex min-w-[3rem] flex-col items-center rounded-lg px-2 py-1 text-xs font-bold text-white',
                    i === 0 ? 'ring-2 ring-indigo-400 ring-offset-1' : '',
                    BINGO_COLUMN_COLORS[getBallLabel(n).split('-')[0] as keyof typeof BINGO_COLUMN_COLORS]
                      ?? 'bg-gray-500',
                  )}
                >
                  <span className="opacity-80">{getBallLabel(n).split('-')[0]}</span>
                  <span className="text-sm">{n}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-5 gap-2">
            {BINGO_COLUMNS.map((col) => {
              const [min, max] = COLUMN_RANGES[col];
              const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
              return (
                <div key={col} className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <div className={cn('py-2 text-center text-sm font-black text-white', BINGO_COLUMN_COLORS[col])}>
                    {col}
                    <span className="mt-0.5 block text-[10px] font-medium opacity-90">{min}–{max}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 bg-gray-50 p-1.5">
                    {nums.map((num) => {
                      const isCalled = calledSet.has(num);
                      const isLatest = num === lastDrawn;
                      return (
                        <div
                          key={num}
                          className={cn(
                            'flex h-9 items-center justify-center rounded-md text-sm font-bold transition-all',
                            isCalled
                              ? cn(BINGO_COLUMN_COLORS[col], 'text-white shadow-sm')
                              : 'bg-white text-gray-400',
                            isLatest && 'ring-2 ring-indigo-500 ring-offset-1 scale-105',
                          )}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
