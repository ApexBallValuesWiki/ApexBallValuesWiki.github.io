import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apexBanner from '../assets/apex-banner.png';
import { BASE_UNITS } from '../data/units';
import { useData } from '../context/DataContext';
import pillowWiki from '../assets/pillows/pillow-wiki.png';
import pillowValues from '../assets/pillows/pillow-values.png';
import pillowTradeCalc from '../assets/pillows/pillow-tradecalc.png';
import pillowCredits from '../assets/pillows/pillow-credits.png';
import pillowOfficial from '../assets/pillows/pillow-official.png';
import pillowBallTd from '../assets/pillows/pillow-balltd.png';
import pillowCgs from '../assets/pillows/pillow-cgs.png';
import pillowSocials from '../assets/pillows/pillow-socials.png';
import pillowBallKnow from '../assets/pillows/pillow-ballknow.png';
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
  // Live unit count: static roster + units created by editors (base variants
  // only — shinies are their own pages). Falls back to the static roster
  // while the database loads.
  const { unitValues } = useData();
  const liveBaseCount = unitValues?.filter((u) => u.kind !== 'item' && !u.shiny).length;
  const unitCount = liveBaseCount > 0 ? liveBaseCount : BASE_UNITS.length;

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
              <img src={apexBanner} alt="Apex WIKI & Values" className="hero-banner" />
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
              <img src={pillowWiki} alt="WIKI" className="home-pillow" />
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
              <img src={pillowValues} alt="Values" className="home-pillow" />
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
              <img src={pillowTradeCalc} alt="Trade Calculator" className="home-pillow" />
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
              to="/minigames"
              className="home-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <img src={pillowBallKnow} alt="Minigames" className="home-pillow" />
              <h3>Minigames</h3>
              <p className="home-card-desc">Play games, earn achievements</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">Ball Knowledge, Ballonomics, Balling and more — unlock reward themes by completing achievement sets.</p>
            </MotionLink>

            <MotionLink
              to="/credits"
              className="home-card"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
            >
              <img src={pillowCredits} alt="Credits" className="home-pillow" />
              <h3>Credits</h3>
              <p className="home-card-desc">Owner, tester lead, and testers</p>
              <div className="home-card-divider">
                <span className="home-card-divider-line" />
                <span className="home-card-divider-x">×</span>
                <span className="home-card-divider-line" />
              </div>
              <p className="home-card-note">See the people who helped shape Testing.</p>
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
              <img src={pillowBallTd} alt="Ball Tower Defense Roblox game" className="game-card-img" />
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
              <img src={pillowOfficial} alt="Official Ball TD Discord server" className="game-card-img" />
              <h3>Join Official Ball TD Discord</h3>
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
              <img src={pillowCgs} alt="Cash Grab Studios Roblox group" className="game-card-img" />
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
              <img src={pillowSocials} alt="Cash Grab Studios YouTube channel" className="game-card-img" />
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
