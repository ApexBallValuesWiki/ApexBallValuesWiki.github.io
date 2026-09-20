import { motion } from 'framer-motion';
import { CHANGELOG, TAG_META } from '../data/changelog';
import './Changelog.css';

// ============================================================================
// Changelog — "What's new on APEX". Renders src/data/changelog.js as a
// timeline, newest first. Editors: add entries to the data file, not here.
// ============================================================================

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay } }),
};

function fmtDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Changelog() {
  return (
    <main className="changelog-page">
      <motion.section className="changelog-hero" variants={fadeUp} initial="initial" animate="animate">
        <p className="crumb">APEX / CHANGELOG</p>
        <h1>What's new on APEX</h1>
        <p className="changelog-sub">
          Every update to the site, newest first. Values change daily — those live on the
          Values pages; this log is about the site itself.
        </p>
      </motion.section>

      <div className="changelog-timeline">
        {CHANGELOG.map((entry, i) => {
          const tag = TAG_META[entry.tag] || TAG_META.site;
          return (
            <motion.article
              key={`${entry.date}-${entry.title}`}
              className="changelog-entry card"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              custom={Math.min(i * 0.05, 0.4)}
            >
              <div className="changelog-entry-head">
                <span className="changelog-date">{fmtDate(entry.date)}</span>
                <span className="changelog-tag" style={{ color: tag.color, borderColor: `color-mix(in srgb, ${tag.color} 45%, transparent)`, background: `color-mix(in srgb, ${tag.color} 12%, transparent)` }}>
                  {tag.label}
                </span>
                {entry.version && <span className="changelog-version">{entry.version}</span>}
              </div>
              <h2>{entry.title}</h2>
              <ul>
                {(entry.items || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </div>
    </main>
  );
}
