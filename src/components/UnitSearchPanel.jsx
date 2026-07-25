import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { sortUnitsByRarityThenName } from '../utils/sortUnits';
import UnitIcon from './UnitIcon';
import { useOverflowScroll } from '../hooks/useOverflowScroll';
import { useData } from '../context/DataContext';
import './UnitSearchPanel.css';

export default function UnitSearchPanel({ basePath, autoFocus = true, units: propUnits = null }) {
  const { unitValues } = useData();
  const units = propUnits || unitValues;
  const [query, setQuery] = useState('');
  const [openRarities, setOpenRarities] = useState(() => ({ Normie: true }));
  const resultsRef = useOverflowScroll([query, openRarities, units]);
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UNIT_RARITIES.map((rarity) => {
      const groupedUnits = units
        .filter((unit) => unit.rarity === rarity)
        .filter((unit) => !q || unit.name.toLowerCase().includes(q) || unit.slug.includes(q.replace(/\s+/g, '-')));
      return { rarity, units: sortUnitsByRarityThenName(groupedUnits) };
    }).filter((group) => group.units.length > 0);
  }, [query, units]);

  function goTo(unit) {
    navigate(`${basePath}/${encodeURIComponent(unit.rarity)}?highlight=${unit.slug}`);
  }

  function toggleRarity(rarity) {
    setOpenRarities((prev) => ({ ...prev, [rarity]: !prev[rarity] }));
  }

  const searching = query.trim().length > 0;

  return (
    <div className="usp-panel">
      <input
        type="text"
        className="usp-input"
        placeholder="Search for any unit…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
      />
      <div ref={resultsRef} className="usp-results" data-lenis-prevent onTouchMove={(e) => e.stopPropagation()}>
        {groups.length === 0 ? (
          <div className="usp-empty">No units match &quot;{query}&quot;.</div>
        ) : (
          groups.map(({ rarity, units }) => {
            const glow = getRarityGlow(rarity);
            const isOpen = searching || !!openRarities[rarity];
            return (
              <section key={rarity} className="usp-rarity-group">
                <button
                  type="button"
                  className="usp-rarity-head"
                  onClick={() => toggleRarity(rarity)}
                  style={{ '--rarity-glow': glow }}
                >
                  <span>{rarity}</span>
                  <small>{units.length} units</small>
                  <b>{isOpen ? '⌃' : '⌄'}</b>
                </button>

                {isOpen && (
                  <div className="usp-rarity-list">
                    {units.map((unit) => {
                      const unitGlow = getRarityGlow(unit.rarity);
                      return (
                        <button type="button" key={unit.slug} className="usp-option" onClick={() => goTo(unit)}>
                          <UnitIcon
                            slug={unit.slug}
                            name={unit.name}
                            glowColor={unitGlow}
                            shiny={isShinyRarity(unit.rarity)}
                            size={42}
                          />
                          <div className="usp-option-text">
                            <span className="usp-option-name">{unit.name}</span>
                            <span className="usp-option-meta" style={{ color: unitGlow }}>
                              {unit.rarity}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
