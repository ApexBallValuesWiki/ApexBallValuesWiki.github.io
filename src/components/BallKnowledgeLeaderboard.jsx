import { useMemo } from 'react';
import './BallKnowledgeLeaderboard.css';

const LB_KEY = 'apex-ball-knowledge-stats-v1';

function loadStats() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function BallKnowledgeLeaderboard() {
  const stats = useMemo(() => {
    const data = loadStats();
    const wins = data.wins || 0;
    const streak = data.currentStreak || 0;
    const bestStreak = data.bestStreak || 0;
    const totalGames = data.totalGames || 0;
    const avgGuesses = data.avgGuesses || 0;

    return { wins, streak, bestStreak, totalGames, avgGuesses };
  }, []);

  return (
    <div className="bk-leaderboard">
      <h3>🧠 Your Ball Knowledge Stats</h3>
      <div className="bk-stats-grid">
        <div className="bk-stat">
          <span className="bk-stat-value">{stats.wins}</span>
          <span className="bk-stat-label">Wins</span>
        </div>
        <div className="bk-stat">
          <span className="bk-stat-value">{stats.streak}</span>
          <span className="bk-stat-label">Current Streak</span>
        </div>
        <div className="bk-stat">
          <span className="bk-stat-value">{stats.bestStreak}</span>
          <span className="bk-stat-label">Best Streak</span>
        </div>
        <div className="bk-stat">
          <span className="bk-stat-value">{stats.totalGames}</span>
          <span className="bk-stat-label">Games Played</span>
        </div>
        <div className="bk-stat">
          <span className="bk-stat-value">{stats.avgGuesses.toFixed(1)}</span>
          <span className="bk-stat-label">Avg Guesses</span>
        </div>
        <div className="bk-stat">
          <span className="bk-stat-value">{stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0}%</span>
          <span className="bk-stat-label">Win Rate</span>
        </div>
      </div>
    </div>
  );
}
