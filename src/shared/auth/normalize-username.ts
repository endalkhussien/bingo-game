/** Normalize login/agent usernames — lowercase, trimmed. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidAgentUsername(username: string): boolean {
  return /^[a-z0-9_]{2,32}$/.test(normalizeUsername(username));
}
