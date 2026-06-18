'use client';

import Image from 'next/image';
import { useState } from 'react';
import { APP_LOGO_SRC, APP_NAME } from '@/shared/brand';

type AppLogoProps = {
  size?: number;
  className?: string;
};

/** Logo from public/brand/logo.png — shows first letter if image missing. */
export function AppLogo({ size = 40, className = '' }: AppLogoProps) {
  const [failed, setFailed] = useState(false);
  const letter = APP_NAME.trim().charAt(0).toUpperCase() || 'B';

  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-amber-600 font-bold text-white ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
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
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 rounded-lg object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
