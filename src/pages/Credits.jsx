import { motion } from 'framer-motion';
import './Credits.css';
import { ROLE_ICONS, ROLE_LABELS, TEAM_MEMBERS } from '../utils/teamMembers';

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  animate: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const gridVariants = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.16 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
};

// The credits list is derived from the team roster on purpose: this page used
// to be a hand-kept copy of it and drifted (people left the team but stayed
// credited, and roles shown here no longer matched what they can actually do).
const ROLE_PRESENTATION = {
  owner: { icon: 'crown', tier: 'owner' },
  admin: { icon: 'hammer', tier: 'lead' },
  editor: { icon: 'tube', tier: 'tester' },
};

const credits = Object.entries(TEAM_MEMBERS).map(([email, roleKey]) => {
  const { icon, tier } = ROLE_PRESENTATION[roleKey] || ROLE_PRESENTATION.editor;
  return {
    name: email.split('@')[0],
    role: ROLE_LABELS[roleKey] || 'Editor',
    emoji: ROLE_ICONS[roleKey] || '👤',
    icon,
    tier,
  };
});

export default function Credits() {
  return (
    <main className="credits-page">
      <motion.section className="credits-hero" variants={fadeUp} initial="initial" animate="animate">
        <p className="credits-kicker">APEX Values &amp; WIKI</p>
        <h1>Credits</h1>
        <p>
          The people behind the testing, feedback, and chaos that helped build the APEX experience.
        </p>
      </motion.section>

      <motion.section className="credits-grid" variants={gridVariants} initial="initial" animate="animate">
        {credits.map((person) => (
          <motion.article key={person.name} className={`credit-card card ${person.tier}`} variants={cardVariants}>
            <div className="credit-avatar-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', marginBottom: '18px' }}>
              <CreditIcon type={person.icon} />
              <div className="credit-icon-container" style={{
                width: '100px', height: '100px', borderRadius: '50%', background: '#0a0a0e',
                border: `2px solid color-mix(in srgb, var(--credit-accent) 44%, var(--border))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
                boxShadow: 'inset 0 0 12px rgba(255,255,255,0.04)'
              }}>
                {person.emoji}
              </div>
            </div>
            <h2>{person.name}</h2>
            <div className="credit-role">{person.role}</div>
          </motion.article>
        ))}
      </motion.section>
    </main>
  );
}

function CreditIcon({ type }) {
  if (type === 'crown') {
    return (
      <svg className="credit-icon crown-icon" viewBox="0 0 64 42" aria-hidden="true">
        <path d="M5 36 L10 13 L22 28 L32 5 L42 28 L54 13 L59 36" />
        <path d="M8 39 H56" />
        <path d="M32 16 L39 27 L32 35 L25 27 Z" />
        <path d="M14 33 H24 M40 33 H50" />
      </svg>
    );
  }

  if (type === 'hammer') {
    return (
      <svg className="credit-icon hammer-icon" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M25 13 L34 4 L54 24 L45 33 Z" />
        <path d="M19 19 L26 12 L46 32 L39 39 Z" />
        <path d="M25 35 L12 48 Q9 51 12 54 Q15 57 18 54 L31 41" />
        <path d="M34 17 L41 10" />
        <path d="M43 26 L50 19" />
      </svg>
    );
  }

  return (
    <svg className="credit-icon tube-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M24 6 H44" />
      <path d="M28 6 V25 L13 49 Q10 54 14 58 Q18 62 23 58 L51 30 Q55 26 51 22 L39 34" />
      <path d="M36 6 V23" />
      <path d="M21 44 L31 54" />
      <path d="M25 38 L38 51" />
      <circle cx="43" cy="40" r="3" />
      <circle cx="34" cy="48" r="2" />
    </svg>
  );
}
