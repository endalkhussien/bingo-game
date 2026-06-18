/**
 * Portable base64url — works in Electron (all Node versions) and browser.
 * Avoids Buffer 'base64url' encoding which is missing on some runtimes.
 */

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  return b64;
}

export function encodeBase64Url(utf8: string): string {
  const bytes = new TextEncoder().encode(utf8);
  return toBase64Url(bytesToBase64(bytes));
}

export function decodeBase64Url(encoded: string): string {
  const bytes = base64ToBytes(fromBase64Url(encoded));
  return new TextDecoder().decode(bytes);
}
