/**
 * In-memory Redis mock — drop-in replacement for @/lib/redis during unit tests.
 *
 * Supports the exact operations used by lib/game-server/match.ts:
 *   get, set (with EX and NX), exists, del, publish, eval (lock-release Lua)
 *
 * State is held in a plain Map and cleared between tests via resetStore().
 */

const store = new Map<string, string>();

/** Clear all stored data. Call this in beforeEach to isolate tests. */
export function resetStore() {
  store.clear();
}

const mockRedis = {
  async get(key: string): Promise<string | null> {
    return store.get(key) ?? null;
  },

  async set(key: string, value: string, ...args: any[]): Promise<string | null> {
    // Support: SET key value EX ttl NX
    const nx = args.includes("NX");
    if (nx && store.has(key)) return null;
    store.set(key, value);
    return "OK";
  },

  async exists(key: string): Promise<number> {
    return store.has(key) ? 1 : 0;
  },

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (store.delete(k)) count++;
    }
    return count;
  },

  async publish(_channel: string, _message: string): Promise<number> {
    return 1;
  },

  // Mimics the Lua lock-release script: atomic check-and-delete
  async eval(
    _script: string,
    _numkeys: number,
    key: string,
    value: string
  ): Promise<number> {
    if (store.get(key) === value) {
      store.delete(key);
      return 1;
    }
    return 0;
  },

  async quit(): Promise<void> {
    // no-op
  },
};

export default mockRedis;
