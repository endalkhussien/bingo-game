declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

export async function ipc<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.invoke(channel, ...args) as Promise<T>;
  }
  // Browser fallback for development without Electron
  return mockIpc(channel, ...args) as Promise<T>;
}

async function mockIpc(channel: string, ...args: unknown[]): Promise<unknown> {
  const { mockHandlers } = await import('./mock-ipc');
  const handler = mockHandlers[channel];
  if (handler) return handler(...args);
  console.warn(`No mock handler for ${channel}`);
  return null;
}
