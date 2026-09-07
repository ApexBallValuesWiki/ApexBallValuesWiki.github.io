import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loadStats as loadBonoStats } from '../../utils/ballonomics';
import { loadStats as loadBallStats } from '../../utils/balling';
import './Minigames.css';

const BK_STATS_KEY = 'apex-ball-knowledge-stats-v1';
const BONO_STATS_KEY = 'apex-ballonomics-stats-v1';
const BALLING_STATS_KEY = 'apex-balling-stats-v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

export default function MinigamesHome() {
  const bk = readJson(BK_STATS_KEY, { currentStreak: 0, maxStreak: 0, wins: 0 });
  const bkEndlessBest = readJson('apex-achievement-progress-v1', {}).bk_endless_best || 0;
  const bono = loadBonoStats(BONO_STATS_KEY);
  const balling = loadBallStats(BALLING_STATS_KEY);

  const games = [
    {
      to: '/minigames/ball-knowledge',
      icon: '🧠',
      name: 'Ball Knowledge',
      blurb: 'Guess the unit from its upgrade clues. Four difficulties, daily puzzle.',
      chips: [`Streak ${bk.currentStreak ?? 0}`, `Wins ${bk.wins ?? 0}`, `Endless ${bkEndlessBest}`],
    },
    {
      to: '/minigames/ballonomics',
      icon: '📈',
      name: 'Ballonomics',
      blurb: 'Both balls are shown — only the price is hidden. Is the mystery one worth more or less?',
      chips: [`Daily best ${bono.dailyBest ?? 0}/9`, `Endless best ${bono.endlessBest ?? 0}`, `Streak ${bono.currentStreak ?? 0}`],
    },
    {
      to: '/minigames/balling',
      icon: '🟪',
      name: 'Balling',
      blurb: 'A unit hides behind pixels. Every wrong guess sharpens it — name it in time.',
      chips: [`Solves ${balling.solved ?? 0}`, `Best ${balling.bestPoints ?? 0} pts`, `Streak ${balling.currentStreak ?? 0}`],
    },
  ];

  return (
    <main className="mg-page">
      <motion.section className="mg-hero" variants={fadeUp} initial="initial" animate="animate">
        <p className="mg-kicker">Arcade</p>
        <h1>MINIGAMES</h1>
        <p className="mg-tagline">Three daily games built on real Ball TD data — stats, values and unit art.</p>
        <p className="mg-time-note">Daily puzzles reset at 3PM EST, verified by global time.</p>
      </motion.section>

      <motion.div className="mg-grid" variants={fadeUp} initial="initial" animate="animate" custom={0.08}>
        {games.map((game) => (
          <Link key={game.to} to={game.to} className="mg-card">
            <span className="mg-card-icon" aria-hidden="true">{game.icon}</span>
            <h2>{game.name}</h2>
            <p>{game.blurb}</p>
            <div className="mg-card-stats">
              {game.chips.map((chip) => <span key={chip} className="mg-chip">{chip}</span>)}
            </div>
            <span className="mg-card-cta">Play →</span>
          </Link>
        ))}
      </motion.div>
    </main>
  );
}
