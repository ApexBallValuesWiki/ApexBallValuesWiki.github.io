import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MaintenancePage } from './SiteGate';

describe('maintenance screen', () => {
  it('keeps the sign-in form with a quiet static background', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter><MaintenancePage message="Back soon" /></MemoryRouter>,
    );
    expect(html).toContain('Back soon');
    expect(html).toContain('Admin email');
    expect(html).toContain('Passcode');
    expect(html).toContain('Sign in &amp; open Admin');
    expect(html).not.toMatch(/<(canvas|video)\b/);
  });
});
