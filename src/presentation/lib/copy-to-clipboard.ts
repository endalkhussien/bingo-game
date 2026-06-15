/**
 * Reliable clipboard copy — works in Electron (IPC), modern browsers, and legacy fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const value = String(text ?? '');
  if (!value) return false;

  if (typeof window !== 'undefined' && window.electronAPI?.invoke) {
    try {
      const result = await window.electronAPI.invoke('clipboard:write', value) as { success?: boolean };
      if (result?.success !== false) return true;
    } catch {
      // fall through
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    if (typeof document === 'undefined') return false;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
