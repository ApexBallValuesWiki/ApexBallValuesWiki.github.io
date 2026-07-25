import { useData } from '../context/DataContext';
import { rowToWikiCustomUnit } from '../utils/wikiOverrides';

export { rowToWikiCustomUnit };

export function useWikiCustomUnits() {
  const { customUnits, wikiLoading: loading, wikiError: error } = useData();
  return { customUnits, loading, error };
}
