import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apexBanner from '../assets/apex-banner.png';
import ballTdGame from '../assets/ball-td-game.png';
import cashGrabStudios from '../assets/cash-grab-studios.png';
import { BASE_UNITS } from '../data/units';
import AdSlot from '../components/AdSlot';
import './Home.css';

const MotionLink = motion(Link);
const MotionAnchor = motion.a;

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  animate: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const gridVariants = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Home() {
  const unitCount = BASE_UNITS.length;

  return (
    <div className="home-layout-wrapper" style={{ display: 'flex', gap: '72px', maxWidth: '1750px', margin: '0 auto', padding: '0 16px', position: 'relative' }}>
      <style>{`
        @media (max-width: 1100px) {
          .home-side-ad {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Left Sidebar Ad */}
      <div className="home-side-ad left" style={{ width: '160px', flexShrink: 0, marginTop: '80px', position: 'sticky', top: '80px', height: 'fit-content' }}>
        <AdSlot slotId="2911497117" />
      </div>

      {/* Main Content */}
      <div className="home-main-content" style={{ flex: 1, minWidth: 0 }}>
        <div className="home">
          <section className="hero">
            <motion.div
              className="hero-banner-frame"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <img src={apexBanner} alt="Apex Values &amp; Wiki" className="hero-banner" />
            </motion.div>

            <motion.h1
              className="hero-title"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              custom={0.15}
            >
              The <span className="hero-title-accent">DEFINITIVE</span> WIKI &amp; Values Website for
              Ball Tower Defense
            </motion.h1>

            <motion.div className="hero-divider" variants={fadeUp} initial="initial" animate="animate" custom={0.28}>
              <span className="hero-divider-line" />
              <span className="hero-divider-x">×</span>
              <span className="hero-divider-line" />
            </motion.div>

            <motion.p className="hero-sub" variants={fadeUp} initial="initial" animate="animate" custom={0.36}>
              {unitCount} Units, All Values &amp; Trade Calculator, Ball Knowledge, Stat sheets, Rankings and MUCH more!
            </motion.p>
          </section>

          <motion.section className="home-grid" variants={gridVariants} initial="initial" animate="animate">
            <MotionLink
              to="/wiki"
              className="home-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.85, color: '#4d9dff' }}>
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
                <path d="M6 14h10" />
              </svg>
              <h3>WIKI</h3>
              <p className="home-card-desc">{unitCount} Units, Items, Maps, and Skins</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Full stat sheets, obtain methods, and upgrades</p>
            </MotionLink>

            <MotionLink
              to="/values"
              className="home-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.85, color: '#00ff91' }}>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h3>Values</h3>
              <p className="home-card-desc">{unitCount} Units, Consumables, Currencies, and Gamepasses</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Values sourced from real trades &amp; market.</p>
            </MotionLink>

            <MotionLink
              to="/values/calculator"
              className="home-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.85, color: '#ffaa00' }}>
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <line x1="9" y1="22" x2="9" y2="16" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="16" y1="16" x2="16" y2="22" />
                <circle cx="9" cy="11" r="1" />
                <circle cx="15" cy="11" r="1" />
              </svg>
              <h3>Trade Calculator</h3>
              <p className="home-card-desc">Quick calculator</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Values collected from our Database, sourced from real trades &amp; market.</p>
            </MotionLink>

            <MotionLink
              to="/ball-knowledge"
              className="home-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.85, color: '#ff4d4d' }}>
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3.01 3.01 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2Z" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3.01 3.01 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2Z" />
              </svg>
              <h3>Ball Knowledge</h3>
              <p className="home-card-desc">Daily unit guessing game</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Test your Ball TD unit knowledge from upgrade stat clues.</p>
            </MotionLink>

            <MotionLink
              to="/credits"
              className="home-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.85, color: '#b679ff' }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <h3>Credits</h3>
              <p className="home-card-desc">Owner, tester lead, and testers</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">See the people who helped shape APEX.</p>
            </MotionLink>

            <MotionAnchor
              href="https://www.roblox.com/games/18343561950/Ball-Tower-Defense"
              target="_blank"
              rel="noreferrer"
              className="home-card game-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <img src={ballTdGame} alt="Ball Tower Defense Roblox game" className="game-card-img" />
              <h3>Play Ball TD</h3>
              <p className="home-card-desc">Official Roblox experience</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Open Ball Tower Defense on Roblox.</p>
            </MotionAnchor>

            <MotionAnchor
              href="https://discord.gg/kWhpVncQwr"
              target="_blank"
              rel="noreferrer"
              className="home-card game-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <img src={ballTdGame} alt="Ball Tower Defense Discord server" className="game-card-img" />
              <h3>Join Discord</h3>
              <p className="home-card-desc">Community server</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Join the Ball Tower Defense Discord community.</p>
            </MotionAnchor>

            <MotionAnchor
              href="https://www.roblox.com/communities/32380537/Cash-Grab-Studios#!/about"
              target="_blank"
              rel="noreferrer"
              className="home-card game-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <img src={cashGrabStudios} alt="Cash Grab Studios Roblox group" className="game-card-img" />
              <h3>Cash Grab Studios</h3>
              <p className="home-card-desc">Official Roblox community</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Open the Cash Grab Studios group.</p>
            </MotionAnchor>

            <MotionAnchor
              href="https://www.youtube.com/@CashGrabStudios"
              target="_blank"
              rel="noreferrer"
              className="home-card game-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <img src={cashGrabStudios} alt="Cash Grab Studios YouTube channel" className="game-card-img" />
              <h3>YouTube</h3>
              <p className="home-card-desc">Cash Grab Studios channel</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Watch Cash Grab Studios on YouTube.</p>
            </MotionAnchor>
          </motion.section>

          <motion.div
            className="home-bug-report-wrap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          >
            <MotionLink
              to="/bug-report"
              className="home-bug-report-button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="home-bug-report-icon" aria-hidden="true">!</span>
              Found a problem? Report a Bug
              <span aria-hidden="true">→</span>
            </MotionLink>
          </motion.div>
        </div>
      </div>

      {/* Right Sidebar Ad */}
      <div className="home-side-ad right" style={{ width: '160px', flexShrink: 0, marginTop: '80px', position: 'sticky', top: '80px', height: 'fit-content' }}>
        <AdSlot slotId="2911497117" />
      </div>
    </div>
  );
}
