import { useMemo, useState } from 'react';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { ALL_VALUE_ENTRIES } from '../data/values';
import UnitIcon from './UnitIcon';
import Autocomplete from './Autocomplete';
import { formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import './ValueEntryPicker.css';

// The calculator uses the same menu and keyboard behaviour as the other unit
// pickers, while retaining currency actions and rarity-grouped browsing.
export default function ValueEntryPicker({ onPick, onPickCurrency = null, currencies = [], placeholder = 'Search units & items…', entries = null }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (item) => !q || String(item.name || '').toLowerCase().includes(q) || String(item.slug || '').toLowerCase().includes(q.replace(/\s+/g, '-'));
    const buckets = new Map();
    const currencyOptions = currencies.filter(match).map((currency) => ({ value: `currency:${currency.slug}`, label: currency.name, kind: 'currency', item: currency }));
    if (currencyOptions.length) buckets.set('Currency', currencyOptions);
    for (const entry of (entries || ALL_VALUE_ENTRIES)) {
      if (!entry.hasValue || !match(entry)) continue;
      const key = entry.kind === 'unit' ? (UNIT_RARITIES.includes(entry.rarity) ? entry.rarity : 'Other') : 'Items & Materials';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ value: `${entry.kind}:${entry.slug}`, label: entry.name, kind: 'entry', item: entry });
    }
    const order = ['Currency', ...UNIT_RARITIES, 'Items & Materials', 'Other'];
    return order.filter((key) => buckets.has(key)).map((key) => ({ label: key, options: buckets.get(key) }));
  }, [entries, currencies, query]);

  function select(option) {
    setQuery('');
    if (option.kind === 'currency') onPickCurrency?.(option.item);
    else onPick(option.item);
  }
  function renderOption(option) {
    const item = option.item;
    const glow = getRarityGlow(item.rarity);
    return <>
      {option.kind === 'currency' ? <img className="dd-option-icon" src={item.icon} alt="" /> : item.kind === 'unit' ? (
        <UnitIcon slug={item.slug} name={item.name} glowColor={glow} shiny={isShinyRarity(item.rarity)} size={28} imageUrl={item.imageUrl} />
      ) : <span className="vep-item-icon">{item.name[0]}</span>}
      <span className="vep-option-text"><span className="dd-option-label">{item.name}</span><small className="dd-option-meta">{option.kind === 'currency' ? 'Enter an amount' : item.rarity || item.group}</small></span>
      {option.kind !== 'currency' && <span className="vep-option-value" title={`${formatFullNumber(item.tradeValue)} exact`}>{formatCompactNumber(item.tradeValue)}</span>}
    </>;
  }
  return <Autocomplete className="vep-wrap" ariaLabel={placeholder} value={query} onChange={setQuery} onSelect={select} groups={groups} placeholder={placeholder} renderOption={renderOption} emptyText="No matching units or items with market data." />;
}
