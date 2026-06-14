'use client';

import { CARTELLA_MAX } from '@/shared/constants';
import { cn } from '@/presentation/lib/utils';

interface NumberGridProps {
  selected: number[];
  called?: number[];
  onToggle: (num: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function NumberGrid({ selected, called = [], onToggle, onClear, disabled }: NumberGridProps) {
  const numbers = Array.from({ length: CARTELLA_MAX }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <button onClick={onClear} disabled={disabled || selected.length === 0}
          className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-40">
          Clear Cards
        </button>
      </div>
      <div className="number-grid-scroll max-h-[calc(100vh-320px)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
        <div className="grid grid-cols-10 gap-1.5">
          {numbers.map((num) => {
            const isSelected = selected.includes(num);
            const isCalled = called.includes(num);
            return (
              <button key={num} onClick={() => !disabled && onToggle(num)} disabled={disabled}
                className={cn(
                  'flex h-10 items-center justify-center rounded-md text-sm font-bold transition-all',
                  isCalled ? 'bg-green-500 text-white ring-2 ring-green-300'
                    : isSelected ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                )}>
                {num}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Cartella 1–{CARTELLA_MAX}: blue = selected cards · green = ball called (1–75)
      </p>
    </div>
  );
}
