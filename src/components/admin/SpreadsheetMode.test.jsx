import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SpreadsheetMode from './SpreadsheetMode';

describe('spreadsheet prefill', () => {
  it('renders compact numeric values, exact hover titles and category controls, including special values', () => {
    const html = renderToStaticMarkup(<SpreadsheetMode canEdit units={[{ slug: 'ball', name: 'Ball', rarity: 'Normie' }]} valueRows={[{ slug: 'ball', baseValue: 1234, baseValueMax: 1500, gems: 'O/C', coins: 55, demand: 'High', scarcity: 'Limited', trend: 'rising', notes: 'Keep' }]} />);
    // Site-wide K/M/B/T suffixes: cells display compact when not focused.
    expect(html).toContain('value="1.23K"');
    expect(html).toContain('value="1.5K"');
    // Exact numbers remain available on hover for editors who need them.
    expect(html).toContain('title="1,234 — K/M/B/T accepted"');
    expect(html).toContain('title="1,500 — K/M/B/T accepted"');
    // Non-numeric special values and sub-1000 numbers are untouched.
    expect(html).toContain('value="O/C"');
    expect(html).toContain('value="55"');
    expect(html).toContain('High');
    expect(html).toContain('Limited');
    expect(html.toLowerCase()).toContain('rising');
  });
});
