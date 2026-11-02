import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  saveAdminCredentials,
  getAdminCredentials,
  saveAdminSessionToken,
  getAdminSessionToken,
  clearAdminCredentials,
  hasAdminAuth,
} from './adminSession';
import { resolveImageUrl, localImageName } from './localAssets';

function storage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('sessionStorage', storage());
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('editor credentials', () => {
  it('never persists a passcode in localStorage', () => {
    localStorage.setItem('apex-admin-email-v1', 'legacy@example.com');
    localStorage.setItem('apex-admin-passcode-v1', 'old-secret');
    saveAdminCredentials('Editor@Example.com', 'new-secret');
    expect(localStorage.getItem('apex-admin-passcode-v1')).toBeNull();
    expect(localStorage.getItem('apex-admin-email-v1')).toBeNull();
    expect(sessionStorage.getItem('apex-admin-passcode-v1')).toBe('new-secret');
    expect(getAdminCredentials()).toEqual({ email: 'editor@example.com', passcode: 'new-secret' });
  });

  it('drops the plaintext passcode once a signed session exists', () => {
    saveAdminCredentials('editor@example.com', 'secret');
    saveAdminSessionToken('aaa.bbb.ccc.ddd', Date.now() + 3600_000, 'editor@example.com');
    expect(getAdminSessionToken()).toBe('aaa.bbb.ccc.ddd');
    expect(sessionStorage.getItem('apex-admin-passcode-v1')).toBeNull();
    expect(hasAdminAuth()).toBe(true);
  });

  it('expires stale sessions', () => {
    saveAdminSessionToken('expired', Date.now() - 1000, 'editor@example.com');
    expect(getAdminSessionToken()).toBe('');
    expect(hasAdminAuth()).toBe(false);
  });

  it('clearAdminCredentials removes every scoped key', () => {
    saveAdminCredentials('editor@example.com', 'secret');
    clearAdminCredentials();
    expect(hasAdminAuth()).toBe(false);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });
});

describe('self-hosted unit artwork', () => {
  const SUPABASE = 'https://rfeoicbcprziqlcmbjgi.supabase.co/storage/v1/object/public/unit-images/Basic%20Ball.png';

  it('rewrites Supabase URLs to same-origin local files', () => {
    const resolved = resolveImageUrl(SUPABASE);
    expect(resolved.startsWith('/images/units/')).toBe(true);
    expect(resolved.endsWith(localImageName(SUPABASE))).toBe(true);
    expect(resolved).not.toContain('supabase');
  });

  it('leaves data URIs, relative paths and other hosts untouched', () => {
    expect(resolveImageUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(resolveImageUrl('/images/local.png')).toBe('/images/local.png');
    expect(resolveImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(resolveImageUrl(null)).toBeNull();
  });

  it('sanitises filenames', () => {
    expect(localImageName(SUPABASE)).toMatch(/^[a-zA-Z0-9._-]+$/);
  });
});
