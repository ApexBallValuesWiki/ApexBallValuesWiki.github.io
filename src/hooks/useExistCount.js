import { useSyncExternalStore } from 'react';
import { getExistSnapshot, subscribeExistCounts } from '../utils/existCountStore';

/** One shared store, one subscription per mounted badge. */
export function useExistCounts() {
  return useSyncExternalStore(subscribeExistCounts, getExistSnapshot, getExistSnapshot);
}

/** Returns the live integer for one unit, or null when there is no data. */
export function useExistCount(slug) {
  const state = useExistCounts();
  const value = state.counts[String(slug || '').toLowerCase()];
  return Number.isInteger(value) ? value : null;
}
