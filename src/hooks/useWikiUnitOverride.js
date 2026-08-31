import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { mergeWikiOverride } from '../utils/wikiOverrides';

export { mergeWikiOverride };

export function useWikiUnitOverride(slug) {
  const { getWikiOverride, wikiLoading: loading, wikiError: error } = useData();
  const override = useMemo(() => (slug ? getWikiOverride(slug) : null), [getWikiOverride, slug]);
  return { override, loading: Boolean(slug) && loading, error };
}
