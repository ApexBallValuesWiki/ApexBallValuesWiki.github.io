import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AchievementPopup.css';

export default function AchievementPopup() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const ach = e.detail;
      setQueue(prev => [...prev, ach]);
      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setQueue(prev => prev.filter(a => a.id !== ach.id));
      }, 4000);
    };
    window.addEventListener('apex-achievement-unlocked', handler);
    return () => window.removeEventListener('apex-achievement-unlocked', handler);
  }, []);

  return (
    <div className="achievement-popup-container">
      <AnimatePresence>
        {queue.map((ach) => (
          <motion.div
            key={ach.id}
            className="achievement-popup"
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="achievement-popup-glow" />
            <span className="achievement-popup-icon">{ach.icon}</span>
            <div className="achievement-popup-text">
              <span className="achievement-popup-label">Achievement Unlocked!</span>
              <span className="achievement-popup-name">{ach.name}</span>
              <span className="achievement-popup-desc">{ach.desc}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
