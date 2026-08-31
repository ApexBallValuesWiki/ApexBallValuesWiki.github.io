import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ALL_UNITS } from '../../data/units';
import { useData } from '../../context/DataContext';
import { getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import UnitIcon from '../../components/UnitIcon';
import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import { formatCompactNumber } from '../../utils/formatNumber';
import './UnitCompareV2.css';

export default function UnitCompareV2() {
  const { unitValues } = useData();
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');

  const allUnits = useMemo(() => {
    return unitValues.map(u => ({
      ...u,
      tradeValue: u.tradeValue || 0,
    }));
  }, [unitValues]);

  const unitA = allUnits.find(u => u.slug === selectedA);
  const unitB = allUnits.find(u => u.slug === selectedB);

  const filteredA = useMemo(() => {
    const q = searchA.toLowerCase();
    return allUnits.filter(u => u.name?.toLowerCase().includes(q) || u.slug?.includes(q)).slice(0, 8);
  }, [searchA, allUnits]);

  const filteredB = useMemo(() => {
    const q = searchB.toLowerCase();
    return allUnits.filter(u => u.name?.toLowerCase().includes(q) || u.slug?.includes(q)).slice(0, 8);
  }, [searchB, allUnits]);

  return (
    <PageShell sidebarTitle="WIKI" navTree={[]}>
      <PageIntro eyebrow="WIKI" title="Unit Comparison">
        <p>Compare two units side by side with visual stat charts.</p>
      </PageIntro>

      <div className="compare-v2">
        <div className="compare-selectors">
          {/* Unit A Selector */}
          <div className="compare-selector">
            <input
              className="compare-search"
              value={searchA}
              onChange={(e) => setSearchA(e.target.value)}
              placeholder="Search unit A…"
            />
            <div className="compare-results">
              {filteredA.map(u => (
                <button
                  key={u.slug}
                  className={`compare-option ${selectedA === u.slug ? 'active' : ''}`}
                  onClick={() => { setSelectedA(u.slug); setSearchA(''); }}
                >
                  <UnitIcon slug={u.slug} name={u.name} glowColor={getRarityGlow(u.rarity)} shiny={isShinyRarity(u.rarity)} size={28} />
                  <span>{u.name}</span>
                </button>
              ))}
            </div>
          </div>

          <span className="compare-vs">VS</span>

          {/* Unit B Selector */}
          <div className="compare-selector">
            <input
              className="compare-search"
              value={searchB}
              onChange={(e) => setSearchB(e.target.value)}
              placeholder="Search unit B…"
            />
            <div className="compare-results">
              {filteredB.map(u => (
                <button
                  key={u.slug}
                  className={`compare-option ${selectedB === u.slug ? 'active' : ''}`}
                  onClick={() => { setSelectedB(u.slug); setSearchB(''); }}
                >
                  <UnitIcon slug={u.slug} name={u.name} glowColor={getRarityGlow(u.rarity)} shiny={isShinyRarity(u.rarity)} size={28} />
                  <span>{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        {unitA && unitB && (
          <motion.div
            className="compare-table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="compare-header">
              <div className="compare-unit-a">
                <UnitIcon slug={unitA.slug} name={unitA.name} glowColor={getRarityGlow(unitA.rarity)} shiny={isShinyRarity(unitA.rarity)} size={80} />
                <h3 style={{ color: getRarityGlow(unitA.rarity) }}>{unitA.name}</h3>
                <span style={{ color: getRarityGlow(unitA.rarity) }}>{unitA.rarity}</span>
              </div>
              <div className="compare-unit-b">
                <UnitIcon slug={unitB.slug} name={unitB.name} glowColor={getRarityGlow(unitB.rarity)} shiny={isShinyRarity(unitB.rarity)} size={80} />
                <h3 style={{ color: getRarityGlow(unitB.rarity) }}>{unitB.name}</h3>
                <span style={{ color: getRarityGlow(unitB.rarity) }}>{unitB.rarity}</span>
              </div>
            </div>

            <div className="compare-rows">
              {[
                { label: 'Value', a: unitA.tradeValue, b: unitB.tradeValue },
                { label: 'Demand', a: unitA.demand, b: unitB.demand },
                { label: 'Scarcity', a: unitA.scarcity, b: unitB.scarcity },
                { label: 'Type', a: unitA.type, b: unitB.type },
                { label: 'Category', a: unitA.category, b: unitB.category },
                { label: 'Placement Limit', a: unitA.placementLimit, b: unitB.placementLimit },
                { label: 'Total Cost', a: unitA.totalCost, b: unitB.totalCost },
              ].map(row => (
                <div key={row.label} className="compare-row">
                  <span className="compare-row-a">{typeof row.a === 'number' ? formatCompactNumber(row.a) : (row.a || '—')}</span>
                  <span className="compare-row-label">{row.label}</span>
                  <span className="compare-row-b">{typeof row.b === 'number' ? formatCompactNumber(row.b) : (row.b || '—')}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
