// Assigns each browser a stable anonymous ID via localStorage only (no
// cookies, no server-side auth) so we can tell new visitors from returning
// ones. Call this exactly once per page load (e.g. via a lazy useState
// initializer) — calling it more than once in the same session will make
// `isReturning` look true even on a first visit.

const USER_ID_KEY = "labubu_user_id";

export type AnonymousUser = {
  userId: string;
  isReturning: boolean;
};

export function getOrCreateUser(): AnonymousUser {
  if (typeof window === "undefined") {
    return { userId: "", isReturning: false };
  }

  const existingId = safeGet(USER_ID_KEY);
  if (existingId) {
    return { userId: existingId, isReturning: true };
  }

  const userId = crypto.randomUUID();
  safeSet(USER_ID_KEY, userId);
  return { userId, isReturning: false };
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private browsing / storage disabled
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore — the ID just won't persist across visits this time
  }
}
