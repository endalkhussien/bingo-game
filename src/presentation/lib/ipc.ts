import { isElectron as detectElectron } from '@/shared/runtime';

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

export const isElectron = detectElectron;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ipc<T = any>(channel: string, ...args: unknown[]): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.invoke(channel, ...args) as Promise<T>;
  }
  // Browser fallback for development without Electron
  return mockIpc(channel, ...args) as Promise<T>;
}

/** Alias used by admin pages. */
export const invokeIpc = ipc;

async function mockIpc(channel: string, ...args: unknown[]): Promise<unknown> {
  const { mockHandlers } = await import('./mock-ipc');
  const handler = mockHandlers[channel];
  if (handler) return handler(...args);
  console.warn(`No mock handler for ${channel}`);
  return null;
}
