'use client';

/** @deprecated Caller display shows called numbers — kept for older game-board imports. */
export function CalledNumbersModal(_props: {
  open?: boolean;
  onClose?: () => void;
  called?: number[];
  lastDrawn?: number | null;
  maxBalls?: number;
  language?: string;
  callHistory?: { number: number; drawOrder: number; drawnAt: number }[];
  remainingNumbers?: number[];
}) {
  return null;
}
