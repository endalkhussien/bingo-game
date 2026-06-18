'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';

interface NumberGridProps {
  availableNumbers: number[];
  selectedSet: Set<number>;
  onToggle: (num: number) => void;
  onClear: () => void;
  disabled?: boolean;
  lockedSet?: Set<string | number>;
}

/** Minch-style cartella picker — green = selected, grey = available */
export function NumberGrid({ availableNumbers, selectedSet, onToggle, onClear, disabled, lockedSet }: NumberGridProps) {
  const numbers = useMemo(
    () => [...availableNumbers].sort((a, b) => a - b),
    [availableNumbers],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            disabled={selectedSet.size === 0}
            className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-40"
          >
            Clear Cards
          </button>
        )}
      </div>

      {numbers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-sm text-gray-600">
          <p className="font-medium">No cartellas in your deck</p>
          <p className="mt-2">
            <Link href="/agent/cards/" className="font-semibold text-indigo-600 underline">
              Waliya Cards
            </Link>{' '}
            to add cartellas first.
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
            {numbers.map((num) => {
              const isSelected = selectedSet.has(num);
              const isLocked = lockedSet?.has(num) || lockedSet?.has(String(num));
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => !disabled && !isLocked && onToggle(num)}
                  disabled={disabled || isLocked}
                  className={cn(
                    'relative flex h-9 items-center justify-center rounded text-sm font-bold transition-colors sm:h-10',
                    isLocked
                      ? 'cursor-not-allowed bg-red-100 text-red-600 line-through'
                      : isSelected
                        ? 'bg-[#22c55e] text-white shadow-sm hover:bg-[#16a34a]'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
                  )}
                >
                  {isLocked && <Lock className="absolute right-0 top-0 h-2.5 w-2.5 text-red-500" />}
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
