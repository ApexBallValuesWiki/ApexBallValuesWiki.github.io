// Back-compat re-export. The live market data now lives in a single shared
// <DataProvider> (src/context/DataContext.jsx) instead of being fetched +
// subscribed to independently by every Values page. This keeps the existing
// `useLiveValues()` import working while routing every consumer through the
// one shared subscription.
export { useLiveValues } from '../context/DataContext';
