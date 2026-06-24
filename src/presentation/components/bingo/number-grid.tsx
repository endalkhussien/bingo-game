'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Lock, Shuffle } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';

interface NumberGridProps {
  availableNumbers: number[];
  selectedSet: Set<number>;
  onToggle: (num: number) => void;
  onClear: () => void;
  onShuffle?: () => void;
  shuffled?: boolean;
  disabled?: boolean;
  lockedSet?: Set<string | number>;
  /** Always show slots 1..N in fixed positions; extras above N append at the end. */
  staticMax?: number;
  title?: string;
  clearLabel?: string;
  shuffleLabel?: string;
  shuffledLabel?: string;
}

/** Bold cartella picker — large cells, green = selected, grey = available */
export function NumberGrid({
  availableNumbers,
  selectedSet,
  onToggle,
  onClear,
  onShuffle,
  shuffled,
  disabled,
  lockedSet,
  staticMax,
  title = 'Select Cartellas',
  clearLabel = 'Clear Cards',
  shuffleLabel = 'Shuffle',
  shuffledLabel = 'Shuffled!',
}: NumberGridProps) {
  const [justShuffled, setJustShuffled] = useState(false);

  const sortedAvailable = useMemo(
    () => [...availableNumbers].sort((a, b) => a - b),
    [availableNumbers],
  );

  const availableSet = useMemo(() => new Set(sortedAvailable), [sortedAvailable]);

  const numbers = useMemo(() => {
    if (!staticMax) return sortedAvailable;
    const base = Array.from({ length: staticMax }, (_, i) => i + 1);
    const extras = sortedAvailable.filter((n) => n > staticMax);
    return [...base, ...extras];
  }, [sortedAvailable, staticMax]);

  const handleShuffle = () => {
    setJustShuffled(true);
    window.setTimeout(() => setJustShuffled(false), 2000);
    onShuffle?.();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-lg font-black uppercase tracking-wide text-gray-800">{title}</p>
        <div className="flex items-center gap-3">
          {(justShuffled || shuffled) && (
            <span className="animate-pulse rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
              {shuffledLabel}
            </span>
          )}
          {!disabled && numbers.length > 0 && (
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-700 hover:text-purple-900"
            >
              <Shuffle className="h-4 w-4" />
              {shuffleLabel}
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={onClear}
              disabled={selectedSet.size === 0}
              className="text-sm font-bold text-red-600 hover:text-red-800 disabled:opacity-40"
            >
              {clearLabel}
            </button>
          )}
        </div>
      </div>

      {numbers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center text-sm text-gray-600">
          <p className="text-lg font-bold">No cartellas in your deck</p>
          <p className="mt-2">
            <Link href="/agent/cards/" className="font-semibold text-indigo-600 underline">
              Bingo Cards
            </Link>{' '}
            to add cartellas first.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'overflow-y-auto rounded-xl border-[3px] border-gray-300 bg-white p-4 shadow-md transition-transform',
            justShuffled && 'cartella-shuffle-wiggle',
          )}
        >
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
          >
            {numbers.map((num) => {
              const isSelected = selectedSet.has(num);
              const isLocked = lockedSet?.has(num) || lockedSet?.has(String(num));
              const isAvailable = availableSet.has(num);
              const isMissing = !isAvailable;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => !disabled && !isLocked && isAvailable && onToggle(num)}
                  disabled={disabled || isLocked || isMissing}
                  className={cn(
                    'relative flex min-h-[2.75rem] items-center justify-center rounded-md border-2 text-base font-black transition-colors sm:min-h-[3.25rem] sm:text-lg md:min-h-[3.75rem] md:text-xl',
                    isMissing
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                      : isLocked
                        ? 'cursor-not-allowed border-red-300 bg-red-100 text-red-600 line-through'
                        : isSelected
                          ? 'border-[#15803d] bg-[#22c55e] text-white shadow-md hover:bg-[#16a34a]'
                          : 'border-gray-300 bg-gray-200 text-gray-900 hover:border-gray-400 hover:bg-gray-300',
                  )}
                >
                  {isLocked && <Lock className="absolute right-0.5 top-0.5 h-3 w-3 text-red-500" />}
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
