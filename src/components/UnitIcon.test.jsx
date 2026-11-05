import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('../context/DataContext', () => ({ useData: () => ({ getWikiOverride: () => ({ imageUrl: '/live-original.png' }) }) }));
vi.mock('../utils/wikiImageCache', () => ({ getCachedWikiImage: () => '/cached-original.png', onWikiImageCacheChange: () => () => {} }));
import UnitIcon from './UnitIcon';

describe('unit artwork priority', () => {
  it('keeps the supplied original image URL instead of website decoration icons', () => {
    const html = renderToStaticMarkup(<UnitIcon slug="baller" name="Baller" imageUrl="/unit-original.png" />);
    expect(html).toContain('src="/unit-original.png"');
    expect(html).not.toContain('/provided/');
  });
  it('keeps the live image if no explicit unit image was supplied', () => {
    expect(renderToStaticMarkup(<UnitIcon slug="baller" name="Baller" />)).toContain('src="/live-original.png"');
  });
});
