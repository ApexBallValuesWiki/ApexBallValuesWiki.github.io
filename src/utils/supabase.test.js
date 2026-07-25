import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAdminRedirectUrl,
  getImplicitRecoveryTokensFromUrl,
  getRecoveryCodeFromUrl,
  getRecoveryRedirectPath,
  hasRecoveryCallback,
  normalizeUrlForCleanRouting,
} from './supabase';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getAdminRedirectUrl', () => {
  it('uses the current deployment root instead of a HashRouter admin route', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/#/admin',
      },
    });

    expect(getAdminRedirectUrl()).toBe('https://zenithvalues.github.io/Apex-Ball-TD-WIKI/');
  });

  it('removes recovery query parameters before returning the redirect URL', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'http://localhost:5173/?code=one-time-code&type=recovery#/admin/reset-password',
      },
    });

    expect(getAdminRedirectUrl()).toBe('http://localhost:5173/');
  });
});

describe('password recovery URL helpers', () => {
  it('detects query-string PKCE recovery callbacks and reads the code', () => {
    const location = {
      search: '?code=pkce-code&type=recovery',
      hash: '',
    };

    expect(hasRecoveryCallback(location)).toBe(true);
    expect(getRecoveryRedirectPath(location)).toBe('/admin/reset-password');
    expect(getRecoveryCodeFromUrl(location)).toBe('pkce-code');
  });

  it('detects raw implicit-flow hash recovery callbacks', () => {
    const location = {
      search: '',
      hash: '#access_token=access-123&refresh_token=refresh-456&type=recovery',
    };

    expect(hasRecoveryCallback(location)).toBe(true);
    expect(getRecoveryRedirectPath(location)).toBe('/admin/reset-password?access_token=access-123&refresh_token=refresh-456&type=recovery');
  });

  it('extracts implicit recovery tokens after HashRouter route conversion', () => {
    const location = {
      search: '',
      hash: '#/admin/reset-password?access_token=access-123&refresh_token=refresh-456&type=recovery',
    };

    expect(getImplicitRecoveryTokensFromUrl(location)).toEqual({
      access_token: 'access-123',
      refresh_token: 'refresh-456',
      type: 'recovery',
    });
  });

  it('passes PKCE query recovery callbacks through (already clean)', () => {
    const input = 'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/?code=pkce-code&type=recovery';

    expect(normalizeUrlForCleanRouting(input)).toBe(input);
  });

  it('moves implicit hash recovery tokens onto a clean reset-password route', () => {
    const input =
      'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/#access_token=access-123&refresh_token=refresh-456&type=recovery';
    const expected =
      'https://zenithvalues.github.io/admin/reset-password?access_token=access-123&refresh_token=refresh-456&type=recovery';

    expect(normalizeUrlForCleanRouting(input)).toBe(expected);
  });

  it('converts legacy hash-routed links into clean paths keeping the query', () => {
    const input = 'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/#/wiki/units/Rares?search=ball';
    const expected = 'https://zenithvalues.github.io/wiki/units/Rares?search=ball';

    expect(normalizeUrlForCleanRouting(input)).toBe(expected);
  });

  it('converts legacy hash recovery routes and keeps tokens readable', () => {
    const input =
      'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/#/admin/reset-password?access_token=access-123&refresh_token=refresh-456&type=recovery';
    const expected =
      'https://zenithvalues.github.io/admin/reset-password?access_token=access-123&refresh_token=refresh-456&type=recovery';

    expect(normalizeUrlForCleanRouting(input)).toBe(expected);
  });

  it('leaves clean URLs untouched', () => {
    const input = 'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/wiki/units/Rares';

    expect(normalizeUrlForCleanRouting(input)).toBe(input);
  });
});
