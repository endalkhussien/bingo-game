/** Cross-window live game updates (control panel ↔ caller display). */

export const LIVE_GAME_CHANNEL = 'tebib-live-game';

export interface LiveGameSnapshot {
  id: string;
  gameCode: string;
  betAmount: number;
  status: string;
  playerCount: number;
  totalPot: number;
  prize: number;
  drawnNumbers: number[];
  callHistory: { number: number; drawOrder: number; drawnAt: number }[];
  maxBalls: number;
  voiceType?: string;
  language?: string;
  selectedNumbers?: number[];
  commissionRate?: number;
  startedAt?: number;
}

export type LiveGameMessage =
  | { type: 'game-update'; payload: LiveGameSnapshot | null }
  | { type: 'game-started'; payload: LiveGameSnapshot }
  | { type: 'game-ended' };

export function broadcastLiveGame(message: LiveGameMessage): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(LIVE_GAME_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* ignore */
  }
}

export function subscribeLiveGame(handler: (message: LiveGameMessage) => void): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const channel = new BroadcastChannel(LIVE_GAME_CHANNEL);
  channel.onmessage = (event: MessageEvent<LiveGameMessage>) => handler(event.data);
  return () => channel.close();
}
