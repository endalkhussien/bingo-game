'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '@/presentation/lib/copy-to-clipboard';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: 'primary' | 'outline';
  onCopied?: () => void;
}

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  className = '',
  variant = 'outline',
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFailed(false);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2500);
    } else {
      setFailed(true);
      setTimeout(() => setFailed(false), 3000);
    }
  };

  const base = variant === 'primary'
    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
    : 'border bg-white hover:bg-gray-50';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${base} ${className}`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {failed ? 'Select & Ctrl+C' : copied ? copiedLabel : label}
    </button>
  );
}
