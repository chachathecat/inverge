type RateEntry = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

const globalCache = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, RateEntry>;
};

function getStore() {
  if (!globalCache.__rateLimitStore) {
    globalCache.__rateLimitStore = new Map<string, RateEntry>();
  }
  return globalCache.__rateLimitStore;
}

export function consumeRateLimit(key: string) {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  store.set(key, existing);

  return { allowed: true, remaining: MAX_REQUESTS - existing.count };
}
