import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FirstTimeTutorial.css';

const TUTORIAL_KEY = 'apex-tutorial-seen-v1';

const STEPS = [
  {
    icon: '📖',
    title: 'Welcome to Apex WIKI & Values!',
    text: 'Your complete Ball Tower Defense companion — unit database, live values, and trade calculator.',
  },
  {
    icon: '🔍',
    title: 'Browse the WIKI',
    text: 'Explore 150+ units with full stats, upgrade paths, and how to obtain them.',
  },
  {
    icon: '💰',
    title: 'Check Values',
    text: 'See live trade values, demand, and scarcity for every unit. Use the Trade Calculator to compare deals.',
  },
  {
    icon: '🎨',
    title: 'Customize Your Theme',
    text: 'Head to Theme Studio to personalize colors, fonts, and the entire look of the site.',
  },
];

export default function FirstTimeTutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) {
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // storage blocked — show tutorial anyway
    }
  }, []);

  function close() {
    setVisible(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      // ignore
    }
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      close();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="tutorial-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="tutorial-card"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tutorial-dots">
              {STEPS.map((_, i) => (
                <span key={i} className={`tutorial-dot ${i === step ? 'active' : ''}`} />
              ))}
            </div>

            <motion.div
              key={step}
              className="tutorial-step"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="tutorial-icon">{current.icon}</span>
              <h2>{current.title}</h2>
              <p>{current.text}</p>
            </motion.div>

            <div className="tutorial-actions">
              <button type="button" className="tutorial-skip" onClick={close}>
                Skip
              </button>
              <button type="button" className="tutorial-next" onClick={next}>
                {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
