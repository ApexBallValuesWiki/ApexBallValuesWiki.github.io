import { useMemo } from 'react';
import './QuestionArchive.css';

const ARCHIVE_KEY = 'apex-ball-knowledge-archive-v1';

function loadArchive() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function QuestionArchive() {
  const archive = useMemo(() => loadArchive(), []);

  if (archive.length === 0) {
    return (
      <div className="qa-archive">
        <h3>📋 Question Archive</h3>
        <p className="qa-empty">No past questions yet. Play Ball Knowledge to build your archive!</p>
      </div>
    );
  }

  return (
    <div className="qa-archive">
      <h3>📋 Question Archive ({archive.length})</h3>
      <div className="qa-list">
        {archive.slice(0, 30).map((entry, i) => (
          <div key={i} className={`qa-entry ${entry.correct ? 'correct' : 'wrong'}`}>
            <div className="qa-entry-header">
              <span className="qa-entry-date">{new Date(entry.date).toLocaleDateString()}</span>
              <span className={`qa-entry-status ${entry.correct ? 'correct' : 'wrong'}`}>
                {entry.correct ? '✓ Correct' : '✗ Wrong'}
              </span>
            </div>
            <span className="qa-entry-answer">Answer: {entry.answer}</span>
            {entry.guesses && <span className="qa-entry-guesses">Guesses: {entry.guesses}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
