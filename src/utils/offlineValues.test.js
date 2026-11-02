import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isOfflineValuesMode, setOfflineValuesMode, toggleOfflineValuesMode,
  isBrowserOnline, OFFLINE_VALUES_EVENT,
} from './offlineValues';

describe('OFFLINE Values preference', () => {
  beforeEach(() => {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    };
    globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
    globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent: vi.fn() };
  });

  it('defaults to live (not offline)', () => {
    expect(isOfflineValuesMode()).toBe(false);
  });

  it('persists the preference and broadcasts the change', () => {
    expect(setOfflineValuesMode(true)).toBe(true);
    expect(isOfflineValuesMode()).toBe(true);
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: OFFLINE_VALUES_EVENT, detail: { enabled: true } }),
    );
    expect(toggleOfflineValuesMode()).toBe(false);
    expect(isOfflineValuesMode()).toBe(false);
  });

  it('reports browser connectivity without throwing on a server', () => {
    expect(typeof isBrowserOnline()).toBe('boolean');
  });
});
