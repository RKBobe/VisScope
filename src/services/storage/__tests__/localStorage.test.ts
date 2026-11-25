// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { safeLocalStorage } from '../localStorage';

describe('SafeLocalStorage Service', () => {
  beforeEach(() => {
    safeLocalStorage.clear();
  });

  it('stores and retrieves primitive strings', () => {
    safeLocalStorage.setItem('test_str', 'vis_scope_val');
    expect(safeLocalStorage.getItem('test_str')).toBe('vis_scope_val');
  });

  it('stores and retrieves complex JSON objects', () => {
    const userPrefs = { theme: 'dark', zoom: 1.25, snapToGrid: true };
    safeLocalStorage.setItem('user_prefs', userPrefs);

    const retrieved = safeLocalStorage.getItem<typeof userPrefs>('user_prefs');
    expect(retrieved).toEqual(userPrefs);
  });

  it('returns default fallback when key does not exist', () => {
    const fallback = { count: 0 };
    const val = safeLocalStorage.getItem('non_existent_key', fallback);
    expect(val).toEqual(fallback);
  });

  it('removes item and clears storage accurately', () => {
    safeLocalStorage.setItem('key1', 'val1');
    safeLocalStorage.setItem('key2', 'val2');

    safeLocalStorage.removeItem('key1');
    expect(safeLocalStorage.getItem('key1')).toBeNull();
    expect(safeLocalStorage.getItem('key2')).toBe('val2');

    safeLocalStorage.clear();
    expect(safeLocalStorage.getItem('key2')).toBeNull();
  });

  it('supports item expiration with TTL in milliseconds', async () => {
    safeLocalStorage.setItem('temp_token', 'abc-123', { expiresInMs: 20 });
    expect(safeLocalStorage.getItem('temp_token')).toBe('abc-123');

    // Wait past expiration
    await new Promise((res) => setTimeout(res, 35));
    expect(safeLocalStorage.getItem('temp_token')).toBeNull();
  });
});
