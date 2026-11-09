const USER_AGENT = "FreeGamesList/1.0 (+https://github.com/Tunefish92/FreeGamesList; free games aggregator)";

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${new URL(url).host}`);
  return (await res.json()) as T;
}

interface Entry<T> {
  value?: T;
  expires: number;
  pending?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

/**
 * In-memory cache with stale-while-revalidate: once a value exists it is always
 * served immediately and refreshed in the background after it expires.
 */
export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const entry = store.get(key) as Entry<T> | undefined;
  const now = Date.now();

  const refresh = () => {
    const pending = load()
      .then((value) => {
        store.set(key, { value, expires: Date.now() + ttlMs });
        return value;
      })
      .catch((err) => {
        // Keep serving the old value; retry after a short pause.
        if (entry?.value !== undefined) {
          store.set(key, { value: entry.value, expires: Date.now() + 60_000 });
          return entry.value;
        }
        store.delete(key);
        throw err;
      });
    store.set(key, { ...entry, expires: entry?.expires ?? 0, pending });
    return pending;
  };

  if (entry?.value !== undefined) {
    if (entry.expires < now && !entry.pending) void refresh().catch(() => {});
    return Promise.resolve(entry.value);
  }
  return entry?.pending ?? refresh();
}

/** Forgets all cached values, so the next update run fetches everything fresh. */
export function clearCache(): void {
  store.clear();
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
