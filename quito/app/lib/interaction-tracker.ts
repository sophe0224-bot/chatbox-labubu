// Logs anonymous chat interactions. Today this just POSTs to /api/track,
// which console.logs the event — swap that route to a Drizzle insert once a
// table exists (see examples/d1/app/api/notes/route.ts for the pattern) and
// nothing here needs to change.

import { getOrCreateUserId } from "./anonymous-user";

export type InteractionEvent = {
  userId: string;
  timestamp: string;
  message: string;
};

export type LogResult =
  | { ok: true; tokensLeft: number }
  | { ok: false; reason: "rate_limited" }
  | { ok: false; reason: "cooldown"; cooldownEndsAt: number };

const DAILY_MESSAGE_LIMIT = 20;
const DAILY_COUNT_KEY_PREFIX = "lbb_msg_count_";

// Token budget: every interaction costs tokens; hitting 0 blocks all
// interactions until the cooldown elapses, then tokens refill to full.
export const TOKEN_BUDGET = 1000;
export const TOKENS_PER_INTERACTION = 50;
export const COOLDOWN_MS = 7 * 60 * 1000; // 7 minutes

const TOKENS_LEFT_KEY = "lbb_tokens_left";
const LAST_EXHAUSTED_KEY = "lbb_last_exhausted_timestamp";

export type TokenSnapshot = {
  tokensLeft: number;
  cooldownEndsAt: number | null;
};

export function logInteraction(message: string): LogResult {
  const userId = getOrCreateUserId();
  if (!userId) return { ok: true, tokensLeft: TOKEN_BUDGET }; // SSR: nothing to track yet

  const tokenState = getTokenSnapshot();
  if (tokenState.cooldownEndsAt !== null) {
    return { ok: false, reason: "cooldown", cooldownEndsAt: tokenState.cooldownEndsAt };
  }

  if (!consumeDailyAllowance(userId)) {
    return { ok: false, reason: "rate_limited" };
  }

  const nextTokenState = consumeTokens(tokenState.tokensLeft);

  const event: InteractionEvent = {
    userId,
    timestamp: new Date().toISOString(),
    message,
  };

  sendEvent(event);
  return { ok: true, tokensLeft: nextTokenState.tokensLeft };
}

function consumeDailyAllowance(userId: string): boolean {
  const key = `${DAILY_COUNT_KEY_PREFIX}${userId}_${todayKey()}`;
  const count = Number(safeLocalStorageGet(key) ?? "0");
  if (count >= DAILY_MESSAGE_LIMIT) return false;

  safeLocalStorageSet(key, String(count + 1));
  return true;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, resets daily
}

// Reads the current token state, auto-resetting to a full budget once the
// cooldown from a prior exhaustion has elapsed. Safe to call from the UI on
// mount / on a timer, not just from logInteraction.
export function getTokenSnapshot(): TokenSnapshot {
  const lastExhausted = Number(safeLocalStorageGet(LAST_EXHAUSTED_KEY) ?? "0") || null;

  if (lastExhausted !== null) {
    const cooldownEndsAt = lastExhausted + COOLDOWN_MS;
    if (Date.now() >= cooldownEndsAt) {
      safeLocalStorageSet(TOKENS_LEFT_KEY, String(TOKEN_BUDGET));
      safeLocalStorageRemove(LAST_EXHAUSTED_KEY);
      return { tokensLeft: TOKEN_BUDGET, cooldownEndsAt: null };
    }
    return { tokensLeft: 0, cooldownEndsAt };
  }

  const tokensLeft = Number(safeLocalStorageGet(TOKENS_LEFT_KEY) ?? String(TOKEN_BUDGET));
  return { tokensLeft, cooldownEndsAt: null };
}

function consumeTokens(currentTokensLeft: number): TokenSnapshot {
  const nextTokens = Math.max(0, currentTokensLeft - TOKENS_PER_INTERACTION);
  safeLocalStorageSet(TOKENS_LEFT_KEY, String(nextTokens));

  if (nextTokens <= 0) {
    const exhaustedAt = Date.now();
    safeLocalStorageSet(LAST_EXHAUSTED_KEY, String(exhaustedAt));
    return { tokensLeft: 0, cooldownEndsAt: exhaustedAt + COOLDOWN_MS };
  }

  return { tokensLeft: nextTokens, cooldownEndsAt: null };
}

function sendEvent(event: InteractionEvent): void {
  // Fire-and-forget: tracking must never block or break the chat UI.
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore — worst case the daily limit isn't enforced this session
  }
}
