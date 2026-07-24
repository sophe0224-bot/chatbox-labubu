// Enforces the message limits and logs each interaction. Counts are kept in
// localStorage per user_id, so the 20-message cap is per browser, for the
// lifetime of that browser's ID (not reset daily). Swap `sendEvent` for a
// real backend call once one exists — nothing else here needs to change.

export type InteractionEvent = {
  userId: string;
  timestamp: string;
  message: string;
};

export const MAX_MESSAGE_LENGTH = 100;
export const MAX_MESSAGES_PER_USER = 20;

export type LogResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: "rate_limited" | "too_long" | "empty" };

const MESSAGE_COUNT_KEY_PREFIX = "labubu_msg_count_";

export function logInteraction(userId: string, rawMessage: string): LogResult {
  const message = rawMessage.trim();

  if (!message) return { ok: false, reason: "empty" };
  if (message.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: "too_long" };

  const count = getMessageCount(userId);
  if (count >= MAX_MESSAGES_PER_USER) return { ok: false, reason: "rate_limited" };

  const nextCount = count + 1;
  setMessageCount(userId, nextCount);
  sendEvent({ userId, timestamp: new Date().toISOString(), message });

  return { ok: true, remaining: MAX_MESSAGES_PER_USER - nextCount };
}

export function getRemainingMessages(userId: string): number {
  return Math.max(0, MAX_MESSAGES_PER_USER - getMessageCount(userId));
}

function getMessageCount(userId: string): number {
  return Number(safeGet(countKey(userId)) ?? "0");
}

function setMessageCount(userId: string, count: number): void {
  safeSet(countKey(userId), String(count));
}

function countKey(userId: string): string {
  return `${MESSAGE_COUNT_KEY_PREFIX}${userId}`;
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

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore — worst case the cap isn't enforced this session
  }
}
