'use client';

import { forwardRef } from 'react';
import { cn } from '@/presentation/lib/utils';

export const inputClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, className, disabled, type, id, autoComplete, ...props },
  ref,
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const resolvedAutoComplete = autoComplete ?? (type === 'password' ? 'new-password' : 'off');

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        disabled={disabled}
        autoComplete={resolvedAutoComplete}
        spellCheck={false}
        className={cn(inputClassName, error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20', className)}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});
