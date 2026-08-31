import { useMemo } from 'react';
import { motion } from 'framer-motion';
import PageShell from '../components/PageShell';
import PageIntro from '../components/PageIntro';
import { getAchievements, getUnlockedCount, getTotalCount } from '../utils/achievements';
import './Achievements.css';

export default function Achievements() {
  const achievements = useMemo(() => getAchievements(), []);
  const unlocked = getUnlockedCount();
  const total = getTotalCount();

  // Group by category
  const categories = {};
  achievements.forEach(ach => {
    if (!categories[ach.category]) categories[ach.category] = [];
    categories[ach.category].push(ach);
  });

  return (
    <PageShell sidebarTitle="" navTree={[]}>
      <PageIntro eyebrow="PROFILE" title="Achievements">
        <p>Track your progress and unlock badges by using features across the site.</p>
        <div className="ach-summary">
          <span className="ach-summary-count">{unlocked}</span>
          <span className="ach-summary-sep">/</span>
          <span className="ach-summary-total">{total}</span>
          <span className="ach-summary-label">Unlocked</span>
        </div>
      </PageIntro>

      <div className="ach-page">
        {Object.entries(categories).map(([cat, achs]) => (
          <div key={cat} className="ach-category">
            <h2 className="ach-cat-title">{cat}</h2>
            <div className="ach-grid">
              {achs.map((ach, i) => (
                <motion.div
                  key={ach.id}
                  className={`ach-card ${ach.isUnlocked ? 'unlocked' : 'locked'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="ach-icon-wrap">
                    <span className="ach-icon">{ach.icon}</span>
                    {ach.isUnlocked && <span className="ach-check">✓</span>}
                  </div>
                  <div className="ach-info">
                    <span className="ach-name">{ach.name}</span>
                    <span className="ach-desc">{ach.desc}</span>
                    {!ach.isUnlocked && (
                      <div className="ach-progress-bar">
                        <div className="ach-progress-fill" style={{ width: `${ach.progress * 100}%` }} />
                        <span className="ach-progress-text">{ach.current}/{ach.goal}</span>
                      </div>
                    )}
                    {ach.isUnlocked && (
                      <span className="ach-unlocked-date">
                        Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
