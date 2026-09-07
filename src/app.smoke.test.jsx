import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import App from './App';

// Smoke test: every public page must render WITHOUT a runtime crash.
// Catches "black screen" regressions (a crash above the ErrorBoundary or
// during render leaves the page empty).
describe('app smoke render', () => {
  const routes = ['/', '/values', '/values/calculator', '/wiki', '/theme-editor', '/credits', '/bug-report', '/achievements'];

  for (const route of routes) {
    it(`renders ${route} without crashing`, () => {
      const html = renderToString(
        <MemoryRouter initialEntries={[route]}>
          <DataProvider>
            <App />
          </DataProvider>
        </MemoryRouter>
      );
      expect(html.length).toBeGreaterThan(200);
    });
  }
});
