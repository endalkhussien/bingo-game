'use client';

import Image from 'next/image';
import { useState } from 'react';
import { APP_LOGO_SRC, APP_NAME } from '@/shared/brand';

type AppLogoProps = {
  /** Logo height in px; width scales for the wide Waliya mark (3:2). */
  size?: number;
  wide?: boolean;
  className?: string;
};

/** Waliya logo from public/brand/logo.png — wide ibex mark, fallback letter if missing. */
export function AppLogo({ size = 52, wide = true, className = '' }: AppLogoProps) {
  const [failed, setFailed] = useState(false);
  const letter = APP_NAME.trim().charAt(0).toUpperCase() || 'B';
  const height = size;
  const width = wide ? Math.round(size * 1.5) : size;

  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-amber-600 font-bold text-white ${className}`}
        style={{ width, height, fontSize: Math.round(size * 0.45) }}
        aria-hidden
      >
        {letter}
      </div>
    );
  }

  return (
    <Image
      src={APP_LOGO_SRC}
      alt={`${APP_NAME} logo`}
      width={width}
      height={height}
      unoptimized
      className={`shrink-0 object-contain ${className}`}
      style={{ width, height, maxWidth: width, maxHeight: height }}
      onError={() => setFailed(true)}
    />
  );
}
