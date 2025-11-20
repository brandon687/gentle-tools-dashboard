import { RawInventoryRow } from './googleSheets';

interface CacheEntry {
  data: RawInventoryRow[];
  timestamp: number;
  expiresAt: number;
}

class InventoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: RawInventoryRow[], ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
    console.log(`[Cache] Stored ${data.length} items with key '${key}', expires in ${ttl}ms`);
  }

  get(key: string): RawInventoryRow[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      console.log(`[Cache] Miss for key '${key}' - not found`);
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      console.log(`[Cache] Miss for key '${key}' - expired (age: ${now - entry.timestamp}ms)`);
      this.cache.delete(key);
      return null;
    }

    const age = now - entry.timestamp;
    console.log(`[Cache] Hit for key '${key}' - ${entry.data.length} items (age: ${age}ms)`);
    return entry.data;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      console.log(`[Cache] Cleared key '${key}'`);
    } else {
      this.cache.clear();
      console.log(`[Cache] Cleared all entries`);
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }

  getStats(): { key: string; itemCount: number; age: number; ttl: number }[] {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      itemCount: entry.data.length,
      age: now - entry.timestamp,
      ttl: entry.expiresAt - now,
    }));
  }
}

// Singleton instance
export const inventoryCache = new InventoryCache();
