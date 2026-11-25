/**
 * Safe, type-safe wrapper for browser localStorage with memory fallback.
 * Handles private browsing mode restrictions, quota exceptions, and SSR environments.
 */

export interface StorageOptions {
  expiresInMs?: number;
}

interface StoredEnvelope<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

class SafeLocalStorageService {
  private memoryFallback: Map<string, string> = new Map();
  private isAvailable: boolean | null = null;

  constructor() {
    this.checkAvailability();
  }

  private checkAvailability(): boolean {
    if (this.isAvailable !== null) return this.isAvailable;
    if (typeof window === 'undefined' || !window.localStorage) {
      this.isAvailable = false;
      return false;
    }
    try {
      const testKey = '__vis_scope_storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      this.isAvailable = true;
      return true;
    } catch {
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Retrieve an item from local storage, parsing JSON automatically.
   */
  public getItem<T>(key: string, defaultValue: T): T;
  public getItem<T>(key: string): T | null;
  public getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      let raw: string | null = null;
      if (this.checkAvailability()) {
        raw = window.localStorage.getItem(key);
      } else {
        raw = this.memoryFallback.get(key) ?? null;
      }

      if (raw === null) {
        return defaultValue ?? null;
      }

      try {
        const parsed = JSON.parse(raw);
        // Check if stored with an expiration envelope
        if (parsed && typeof parsed === 'object' && 'value' in parsed && 'timestamp' in parsed) {
          const envelope = parsed as StoredEnvelope<T>;
          if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
            this.removeItem(key);
            return defaultValue ?? null;
          }
          return envelope.value;
        }
        return parsed as T;
      } catch {
        // Raw string value not stored as JSON
        return raw as unknown as T;
      }
    } catch (err) {
      console.warn(`[SafeLocalStorage] Failed to read key "${key}":`, err);
      return defaultValue ?? null;
    }
  }

  /**
   * Store an item in local storage as JSON.
   */
  public setItem<T>(key: string, value: T, options?: StorageOptions): boolean {
    try {
      let payloadToStore: string;
      if (options?.expiresInMs) {
        const envelope: StoredEnvelope<T> = {
          value,
          timestamp: Date.now(),
          expiresAt: Date.now() + options.expiresInMs,
        };
        payloadToStore = JSON.stringify(envelope);
      } else {
        payloadToStore = typeof value === 'string' ? value : JSON.stringify(value);
      }

      if (this.checkAvailability()) {
        window.localStorage.setItem(key, payloadToStore);
      } else {
        this.memoryFallback.set(key, payloadToStore);
      }
      return true;
    } catch (err) {
      console.warn(`[SafeLocalStorage] Failed to write key "${key}":`, err);
      // Fallback to memory on quota error or access denial
      try {
        const fallbackStr = typeof value === 'string' ? value : JSON.stringify(value);
        this.memoryFallback.set(key, fallbackStr);
      } catch {
        // Ignore fallback failure
      }
      return false;
    }
  }

  /**
   * Remove a key from storage.
   */
  public removeItem(key: string): void {
    try {
      if (this.checkAvailability()) {
        window.localStorage.removeItem(key);
      }
      this.memoryFallback.delete(key);
    } catch {
      this.memoryFallback.delete(key);
    }
  }

  /**
   * Clear all keys from storage.
   */
  public clear(): void {
    try {
      if (this.checkAvailability()) {
        window.localStorage.clear();
      }
      this.memoryFallback.clear();
    } catch {
      this.memoryFallback.clear();
    }
  }

  /**
   * Check whether storage is currently backed by browser localStorage or in-memory fallback.
   */
  public isPersistent(): boolean {
    return this.checkAvailability();
  }
}

export const safeLocalStorage = new SafeLocalStorageService();
export default safeLocalStorage;
