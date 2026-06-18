/** Cross-window live game updates (control panel ↔ caller display). */

export const LIVE_GAME_CHANNEL = 'tebib-live-game';
export const LIVE_GAME_STORAGE_KEY = 'tebib_live_game_snapshot';
export const GAME_CONTROL_CHANNEL = 'tebib-game-control';

export type CallingPhase = 'ready' | 'announcing' | 'calling' | 'paused' | 'ended';

export type GameControlMessage =
  | { type: 'start-calling' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'end-game' };

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
  callingPhase?: CallingPhase;
}

export type LiveGameMessage =
  | { type: 'game-update'; payload: LiveGameSnapshot | null }
  | { type: 'game-started'; payload: LiveGameSnapshot }
  | { type: 'game-ended' };

export function persistLiveGameSnapshot(snapshot: LiveGameSnapshot | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (!snapshot) sessionStorage.removeItem(LIVE_GAME_STORAGE_KEY);
    else sessionStorage.setItem(LIVE_GAME_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function readPersistedLiveGame(): LiveGameSnapshot | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LIVE_GAME_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LiveGameSnapshot;
  } catch {
    return null;
  }
}

/** Keep the fullest draw history when merging poll + broadcast snapshots. */
export function mergeLiveGameSnapshots(
  current: LiveGameSnapshot | null,
  incoming: LiveGameSnapshot | null,
): LiveGameSnapshot | null {
  if (!incoming) return current;
  if (!current || current.id !== incoming.id) return incoming;
  if (incoming.drawnNumbers.length >= current.drawnNumbers.length) return incoming;
  return {
    ...incoming,
    drawnNumbers: current.drawnNumbers,
    callHistory: current.callHistory,
    status: incoming.status || current.status,
    callingPhase: incoming.callingPhase ?? current.callingPhase,
  };
}

export function broadcastLiveGame(message: LiveGameMessage): void {
  if (message.type === 'game-ended') {
    persistLiveGameSnapshot(null);
  } else if (message.type === 'game-started' || message.type === 'game-update') {
    if (message.payload) persistLiveGameSnapshot(message.payload);
  }

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

export function broadcastGameControl(message: GameControlMessage): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(GAME_CONTROL_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* ignore */
  }
}

export function subscribeGameControl(handler: (message: GameControlMessage) => void): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const channel = new BroadcastChannel(GAME_CONTROL_CHANNEL);
  channel.onmessage = (event: MessageEvent<GameControlMessage>) => handler(event.data);
  return () => channel.close();
}
