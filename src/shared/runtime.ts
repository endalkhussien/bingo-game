/** True when running in the Electron renderer (preload exposes electronAPI). */
export function isElectron(): boolean {
  const g = globalThis as typeof globalThis & {
    electronAPI?: { invoke?: (...args: unknown[]) => Promise<unknown> };
  };
  return typeof g.electronAPI?.invoke === 'function';
}
