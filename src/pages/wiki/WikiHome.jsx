import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import UnitExplorer from '../../components/UnitExplorer';
import { WIKI_NAV } from '../../config/navigation';
import { BASE_UNITS } from '../../data/units';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import AdSlot from '../../components/AdSlot';
import './WikiHome.css';

export default function WikiHome() {
  // Live count: every base unit on the site (static roster + units the
  // editors created), ??? rarities included. Shinies are their own pages
  // and don't add to the count.
  const { unitValues } = useData();
  const liveBase = unitValues?.filter((u) => u.kind !== 'item' && !u.shiny).length;
  const baseCount = liveBase > 0 ? liveBase : BASE_UNITS.filter((u) => !u.shiny).length;
  const stats = [
    {
      label: 'Units Documented',
      value: `${baseCount} / ${baseCount}`,
      note: 'Shiny variants are listed separately but do not increase the unit count.',
    },
  ];

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <PageIntro eyebrow="Testing Database" title="WIKI">
        <p>
          Units database for Ball Tower Defense. Full stat sheets include cooldowns, range, damage,
          placement counts, passives, abilities, synergies, upgrade costs/DPS/cost-per-DPS, obtain
          methods, unit type, and category tagging.
        </p>
      </PageIntro>

      <div className="wiki-stats">
        {stats.map((s) => (
          <div key={s.label} className="wiki-stat card">
            <div className="wiki-stat-value">{s.value}</div>
            <div className="wiki-stat-label">{s.label}</div>
            {s.note && <div className="wiki-stat-note">{s.note}</div>}
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
        style={{ marginTop: 28 }}
      >
        <UnitExplorer section="wiki" />
      </motion.div>

      <AdSlot slotId="2911497117" />
    </PageShell>
  );
}
