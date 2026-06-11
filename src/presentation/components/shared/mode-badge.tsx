'use client';

import { useEffect, useState } from 'react';

export function ModeBadge() {
  const [mode, setMode] = useState<'desktop' | 'browser' | null>(null);

  useEffect(() => {
    setMode(typeof window !== 'undefined' && window.electronAPI ? 'desktop' : 'browser');
  }, []);

  if (!mode) return null;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      mode === 'desktop' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {mode === 'desktop' ? '● Desktop' : '○ Browser Preview'}
    </span>
  );
}
