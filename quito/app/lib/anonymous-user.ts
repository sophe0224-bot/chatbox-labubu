// Assigns each browser a stable anonymous ID so we can recognize returning
// visitors without any login. The ID lives in both a cookie and localStorage
// so it survives clearing either one on its own.

const USER_ID_KEY = "lbb_uid";
const COOKIE_MAX_AGE_DAYS = 365;

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  const existingId = readCookie(USER_ID_KEY) ?? safeLocalStorageGet(USER_ID_KEY);
  const userId = existingId ?? crypto.randomUUID();

  // Re-sync both stores in case one was cleared but not the other.
  writeCookie(USER_ID_KEY, userId, COOKIE_MAX_AGE_DAYS);
  safeLocalStorageSet(USER_ID_KEY, userId);

  return userId;
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string, maxAgeDays: number): void {
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private browsing / storage disabled
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore — the cookie is still set, so the ID is still usable
  }
}
