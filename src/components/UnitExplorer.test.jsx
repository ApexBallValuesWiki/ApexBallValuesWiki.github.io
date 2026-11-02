import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DataProvider } from '../context/DataContext';
import { ALL_UNITS } from '../data/units';
import UnitExplorer from './UnitExplorer';

describe('unit discovery index', () => {
  it('does not silently exclude units without rich art or a numeric value', () => {
    const html = renderToStaticMarkup(<MemoryRouter><DataProvider><UnitExplorer mode="wiki" /></DataProvider></MemoryRouter>);
    expect(html).toContain(`WIKI INDEX · ${ALL_UNITS.length} UNITS`);
  });
});
