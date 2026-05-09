"use client";

type LruCacheOptions = {
  maxSize: number;
};

export type LruCache<TKey, TValue> = {
  get: (key: TKey) => TValue | null;
  set: (key: TKey, value: TValue) => void;
  clear: () => void;
  size: () => number;
};

export function createLruCache<TKey, TValue>({ maxSize }: LruCacheOptions): LruCache<TKey, TValue> {
  const store = new Map<TKey, TValue>();
  const normalizedMaxSize = Math.max(0, Math.floor(maxSize));

  return {
    get(key) {
      const value = store.get(key);
      if (value === undefined) {
        return null;
      }

      store.delete(key);
      store.set(key, value);
      return value;
    },
    set(key, value) {
      if (normalizedMaxSize <= 0) {
        store.clear();
        return;
      }

      if (store.has(key)) {
        store.delete(key);
      }

      store.set(key, value);

      while (store.size > normalizedMaxSize) {
        const oldestKey = store.keys().next().value as TKey | undefined;
        if (oldestKey === undefined) {
          break;
        }
        store.delete(oldestKey);
      }
    },
    clear() {
      store.clear();
    },
    size() {
      return store.size;
    }
  };
}
