import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_UNITS } from '../data/units';
import { isShinyRarity } from '../data/taxonomy';
import logoImg from '../assets/apex-values-wiki-logo.png';
import ThemeCutout from '../components/ThemeCutout';
import './Home.css';

const BASE_UNIT_COUNT = ALL_UNITS.filter((u) => !isShinyRarity(u.rarity)).length;

const EASE_OUT = [0.23, 1, 0.32, 1];

const SHOWCASE_SLIDES = [
  { id: 'overlord', cutout: 'overlord', ctaLabel: 'Explore Values', ctaTo: '/values' },
  { id: 'poseidon', cutout: 'poseidon', ctaLabel: 'Browse WIKI', ctaTo: '/wiki' },
  { id: 'king', cutout: 'king', ctaLabel: 'Trade Calculator', ctaTo: '/values/calculator' },
  { id: 'laserminigunner', cutout: 'laserminigunner', ctaLabel: 'Leaderboards', ctaTo: '/wiki/leaderboards' },
  { id: 'hacker', cutout: 'hacker', ctaLabel: 'Compare Units', ctaTo: '/wiki/compare' },
  { id: 'drone', cutout: 'drone', ctaLabel: 'Play Arcade', ctaTo: '/minigames' },
  { id: 'forest', cutout: 'forest', ctaLabel: 'Theme Studio', ctaTo: '/themes' },
  { id: 'elfcommander', cutout: 'elfcommander', ctaLabel: 'Unit Search', ctaTo: '/values/units/search' },
  { id: 'partyman', cutout: 'partyman', ctaLabel: 'Achievements', ctaTo: '/achievements' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: EASE_OUT },
  },
};

export default function Home() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [paused]);

  const activeSlide = SHOWCASE_SLIDES[slideIndex];
  const prevSlide = SHOWCASE_SLIDES[(slideIndex - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length];
  const nextSlide = SHOWCASE_SLIDES[(slideIndex + 1) % SHOWCASE_SLIDES.length];

  return (
    <motion.main
      className="home"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Clean Editorial Showcase Stage */}
      <motion.section
        className="home-hero-stage"
        variants={itemVariants}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-label="Featured Apex Showcase"
      >
        <div className="hero-ribbon-bg" aria-hidden="true">
          <div className="hero-ribbon-wave wave-1" />
          <div className="hero-ribbon-wave wave-2" />
          <svg className="hero-trajectory-svg" viewBox="0 0 1200 600" preserveAspectRatio="none">
            <line
              x1="140"
              y1="580"
              x2="1080"
              y2="30"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.5"
              strokeDasharray="6 8"
            />
          </svg>
        </div>

        {/* Center Main Stage Grid */}
        <div className="hero-stage-grid">
          {/* Left Editorial Copy */}
          <div className="hero-editorial-left">
            <h1 className="hero-title">
              THE <span className="hero-highlight">DEFINITIVE</span> WIKI &amp; VALUES WEBSITE FOR BALL TOWER DEFENSE
            </h1>
            <p className="hero-subtitle">
              {BASE_UNIT_COUNT} Units, All Values &amp; Trade Calculator, Ball Knowledge, Stat sheets, Rankings and MUCH more!
            </p>
            <div className="hero-actions">
              <Link to="/values" className="hero-btn primary">
                Explore Values <span aria-hidden="true">→</span>
              </Link>
              <Link to="/wiki" className="hero-btn secondary">
                Browse WIKI
              </Link>
              <Link to="/values/calculator" className="hero-btn secondary">
                Trade Calculator
              </Link>
            </div>
          </div>

          {/* Right Floating Cutout Stage (Clean — no watermark text behind) */}
          <div className="hero-editorial-right">
            {/* Previous Cutout Preview */}
            <button
              type="button"
              className="hero-side-preview prev"
              onClick={() => setSlideIndex((slideIndex - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length)}
              aria-label="Previous showcase unit"
            >
              <ThemeCutout variant={prevSlide.cutout} className="hero-side-cutout" />
              <span className="hero-side-dot" />
              <span className="hero-side-stem" />
            </button>

            {/* Active Cutout Sculpture */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                className="hero-centerpiece"
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -16 }}
                transition={{ duration: 0.38, ease: EASE_OUT }}
              >
                <div className="hero-sculpture-wrap">
                  <ThemeCutout
                    variant={activeSlide.cutout}
                    floating
                    className="hero-main-cutout"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Next Cutout Preview */}
            <button
              type="button"
              className="hero-side-preview next"
              onClick={() => setSlideIndex((slideIndex + 1) % SHOWCASE_SLIDES.length)}
              aria-label="Next showcase unit"
            >
              <ThemeCutout variant={nextSlide.cutout} className="hero-side-cutout" />
              <span className="hero-side-dot" />
              <span className="hero-side-stem" />
            </button>
          </div>
        </div>

        {/* Bottom Stage Bar */}
        <div className="hero-stage-footer">
          <div className="hero-slide-counter">
            <span className="hero-counter-dash">—</span>
            <span className="hero-counter-active">{String(slideIndex + 1).padStart(2, '0')}</span>
            <span className="hero-counter-sep">/</span>
            <span className="hero-counter-total">{String(SHOWCASE_SLIDES.length).padStart(2, '0')}</span>
          </div>

          <div className="hero-slide-dots" role="tablist" aria-label="Showcase slides">
            {SHOWCASE_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={idx === slideIndex}
                aria-label={`Slide ${idx + 1}`}
                className={`hero-dot ${idx === slideIndex ? 'active' : ''}`}
                onClick={() => setSlideIndex(idx)}
              />
            ))}
          </div>

          <div className="hero-stage-controls">
            <button
              type="button"
              className="hero-nav-link"
              onClick={() => setSlideIndex((slideIndex - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length)}
            >
              Prev
            </button>
            <button
              type="button"
              className="hero-nav-link"
              onClick={() => setSlideIndex((slideIndex + 1) % SHOWCASE_SLIDES.length)}
            >
              Next
            </button>
            <Link to={activeSlide.ctaTo} className="hero-corner-cta">
              <span>{activeSlide.ctaLabel}</span>
              <span className="hero-corner-arrow" aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Expanded Primary Hubs: Values, WIKI, Trade Calculator */}
      <div className="bento-grid">
        <motion.div className="bento-card bento-large bento-values" variants={itemVariants}>
          <ThemeCutout variant="poseidon" className="bento-cutout-bg" />
          <div className="bento-top">
            <div className="bento-icon-wrap">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <Link to="/values" className="bento-open-btn">
              Open Values <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="bento-body">
            <h2>Values</h2>
            <p className="bento-desc">
              {BASE_UNIT_COUNT} Units, Consumables, Currencies, and Gamepasses with live demand &amp; scarcity ratings.
            </p>
            <div className="bento-sublinks">
              <Link to="/values/units/Omegas" className="bento-sublink">Omegas</Link>
              <Link to="/values/units/Transcendents" className="bento-sublink">Transcendents</Link>
              <Link to="/values/units/Mythics" className="bento-sublink">Mythics</Link>
              <Link to="/values/units/Legendaries" className="bento-sublink">Legendaries</Link>
              <Link to="/values/crates" className="bento-sublink">Crates &amp; Passes</Link>
              <Link to="/values/units/search" className="bento-sublink">Search All</Link>
            </div>
          </div>
          <div className="bento-footer">
            <span className="bento-meta">Values sourced from real trades &amp; market data</span>
            <Link to="/values" className="bento-arrow" aria-label="Go to Values">→</Link>
          </div>
        </motion.div>

        <motion.div className="bento-card bento-large bento-wiki" variants={itemVariants}>
          <ThemeCutout variant="overlord" className="bento-cutout-bg" />
          <div className="bento-top">
            <div className="bento-icon-wrap">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <Link to="/wiki" className="bento-open-btn">
              Open WIKI <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="bento-body">
            <h2>WIKI</h2>
            <p className="bento-desc">
              {BASE_UNIT_COUNT} Units, full level-by-level stat sheets, DPS breakdowns, obtain methods, Maps, Crates, and Skins.
            </p>
            <div className="bento-sublinks">
              <Link to="/wiki/units/Omegas" className="bento-sublink">All Units ({BASE_UNIT_COUNT})</Link>
              <Link to="/wiki/compare" className="bento-sublink">Compare Units</Link>
              <Link to="/wiki/leaderboards" className="bento-sublink">Leaderboards</Link>
              <Link to="/wiki/maps" className="bento-sublink">Maps</Link>
              <Link to="/wiki/traits" className="bento-sublink">Traits</Link>
              <Link to="/wiki/skins" className="bento-sublink">Skins</Link>
            </div>
          </div>
          <div className="bento-footer">
            <span className="bento-meta">Complete unit stat sheets, obtain methods, and upgrades</span>
            <Link to="/wiki" className="bento-arrow" aria-label="Go to WIKI">→</Link>
          </div>
        </motion.div>

        <motion.div className="bento-card bento-large bento-calc" variants={itemVariants}>
          <ThemeCutout variant="king" className="bento-cutout-bg" />
          <div className="bento-top">
            <div className="bento-icon-wrap">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <Link to="/values/calculator" className="bento-open-btn">
              Calculator <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="bento-body">
            <h2>Trade Calculator</h2>
            <p className="bento-desc">
              Compare multi-unit offers side-by-side with instant Win / Fair / Loss verdicts and Shiny 1.5× support.
            </p>
            <div className="bento-sublinks">
              <Link to="/values/calculator" className="bento-sublink">W / F / L Evaluator</Link>
              <Link to="/values/units/Shiny%20Omegas" className="bento-sublink">Shiny Values</Link>
              <Link to="/values/units/search" className="bento-sublink">Quick Value Lookup</Link>
            </div>
          </div>
          <div className="bento-footer">
            <span className="bento-meta">Live trade formula powered by real market data</span>
            <Link to="/values/calculator" className="bento-arrow" aria-label="Go to Trade Calculator">→</Link>
          </div>
        </motion.div>

        {/* Secondary Cards — each with a monochrome cutout sculpture */}
        <motion.div variants={itemVariants}>
          <Link to="/minigames" className="bento-card bento-small">
            <ThemeCutout variant="laserminigunner" className="bento-cutout-mini" />
            <div className="bento-small-icon">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <div className="bento-small-text">
              <h3>Minigames</h3>
              <p>Play games, earn achievements</p>
              <span className="bento-small-meta">Daily challenges &amp; endless modes</span>
            </div>
            <span className="bento-arrow">→</span>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link to="/credits" className="bento-card bento-small">
            <ThemeCutout variant="elfcommander" className="bento-cutout-mini" />
            <div className="bento-small-icon">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <div className="bento-small-text">
              <h3>Credits</h3>
              <p>Owner, tester lead, and testers</p>
              <span className="bento-small-meta">The people behind Apex WIKI &amp; Values</span>
            </div>
            <span className="bento-arrow">→</span>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <a
            href="https://www.roblox.com/games/94547891458554/Ball-Tower-Defense"
            target="_blank"
            rel="noopener noreferrer"
            className="bento-card bento-small"
          >
            <ThemeCutout variant="partyman" className="bento-cutout-mini" />
            <div className="bento-small-icon">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <div className="bento-small-text">
              <h3>Play Ball TD</h3>
              <p>Official Roblox experience</p>
              <span className="bento-small-meta">Open Ball Tower Defense on Roblox</span>
            </div>
            <span className="bento-arrow">↗</span>
          </a>
        </motion.div>

        <motion.div variants={itemVariants}>
          <a
            href="https://discord.gg/cZ997779g2"
            target="_blank"
            rel="noopener noreferrer"
            className="bento-card bento-small"
          >
            <ThemeCutout variant="hacker" className="bento-cutout-mini" />
            <div className="bento-small-icon">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <div className="bento-small-text">
              <h3>Community Discord</h3>
              <p>Apex WIKI &amp; Values Server</p>
              <span className="bento-small-meta">Discuss values, trades, and updates</span>
            </div>
            <span className="bento-arrow">↗</span>
          </a>
        </motion.div>

        <motion.div variants={itemVariants}>
          <a
            href="https://discord.gg/cashgrabstudios"
            target="_blank"
            rel="noopener noreferrer"
            className="bento-card bento-small"
          >
            <ThemeCutout variant="drone" className="bento-cutout-mini" />
            <div className="bento-small-icon">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <div className="bento-small-text">
              <h3>CGS Discord</h3>
              <p>Cash Grab Studios</p>
              <span className="bento-small-meta">Official game developers server</span>
            </div>
            <span className="bento-arrow">↗</span>
          </a>
        </motion.div>

        <motion.div variants={itemVariants}>
          <a
            href="https://www.youtube.com/@ApexValuesBTD"
            target="_blank"
            rel="noopener noreferrer"
            className="bento-card bento-small"
          >
            <ThemeCutout variant="forest" className="bento-cutout-mini" />
            <div className="bento-small-icon">
              <span className="logo-tint-wrap bento-logo-wrap">
                <img src={logoImg} alt="" className="bento-logo" />
              </span>
            </div>
            <div className="bento-small-text">
              <h3>YouTube</h3>
              <p>@ApexValuesBTD</p>
              <span className="bento-small-meta">Guides, showcases, and tier lists</span>
            </div>
            <span className="bento-arrow">↗</span>
          </a>
        </motion.div>
      </div>
    </motion.main>
  );
}
