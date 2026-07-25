import { useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { loadCachedWikiImages, saveCachedWikiImage } from '../utils/wikiImageCache';

function makeSlugKey(slugs) {
  return [...new Set((slugs || []).filter(Boolean))].sort().join('|');
}

export function useWikiImageOverrides(slugs = []) {
  const { wikiRows, wikiError: error } = useData();
  const slugKey = makeSlugKey(slugs);
  const stableSlugs = useMemo(() => (slugKey ? slugKey.split('|') : []), [slugKey]);

  const imageMap = useMemo(() => {
    const cache = loadCachedWikiImages();
    const requested = stableSlugs.length > 0 ? new Set(stableSlugs) : null;
    const map = {};
    // First apply cached image overrides
    Object.entries(cache).forEach(([slug, url]) => {
      if (url && (!requested || requested.has(slug))) map[slug] = url;
    });
    // Then apply live rows from Supabase table unit_wiki_overrides
    (Array.isArray(wikiRows) ? wikiRows : []).forEach((row) => {
      if (row?.slug && (row.image_url || row.imageUrl) && (!requested || requested.has(row.slug))) {
        map[row.slug] = row.image_url || row.imageUrl;
      }
    });
    return map;
  }, [stableSlugs, wikiRows]);

  return { imageMap, error };
}
