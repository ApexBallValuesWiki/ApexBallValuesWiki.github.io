import { useEffect, useState } from 'react';
import './AdminGuide.css';

const GUIDE_KEY = 'apex-admin-guide-dismissed-v1';

export function openAdminGuide() {
  window.dispatchEvent(new CustomEvent('apex-open-admin-guide'));
}

const STEPS = [
  {
    icon: '1️⃣',
    title: 'Choose a section',
    text: 'Values = trade prices. WIKI = unit stats and info. Create = add something new. Use the buttons at the top to switch.',
  },
  {
    icon: '2️⃣',
    title: 'Find the unit',
    text: 'Type the unit name in the search box, then click it. The editor on the right fills in with what is currently live.',
  },
  {
    icon: '3️⃣',
    title: 'Edit, then press Save',
    text: 'Nothing goes live until you press Save. Unsaved drafts stay in this browser and are listed under "unsaved" at the top.',
  },
  {
    icon: '4️⃣',
    title: 'Double-check in History',
    text: 'Blame & Logs shows every change and who made it. If you make a mistake, you can restore an earlier value from there.',
  },
];

const GLOSSARY = [
  ['Value', 'The estimated trade worth of a unit, in gems.'],
  ['Demand', 'How many players are looking for that unit right now.'],
  ['Override', 'A live edit that replaces the bundled default data.'],
  ['Matrix Sheet', 'A spreadsheet view for changing many values at once.'],
  ['Publish', 'Save your local edits to the shared live database.'],
];

/** Beginner onboarding for the admin panel. Re-openable from the "?" button. */
export default function AdminGuide({ role, valueAllowed, wikiAllowed }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(GUIDE_KEY) === '1'; } catch { /* ignore */ }
    if (!dismissed) setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener('apex-open-admin-guide', onOpen);
    return () => window.removeEventListener('apex-open-admin-guide', onOpen);
  }, []);

  function close() {
    setOpen(false);
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch { /* ignore */ }
  }

  if (!open) return null;

  return (
    <section className="admin-guide" aria-label="Admin panel quick start guide">
      <div className="admin-guide-head">
        <div>
          <span className="admin-guide-kicker">START HERE</span>
          <h2>How to use this panel</h2>
          <p>You are signed in as <strong>{role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Editor'}</strong>. Four steps cover almost everything you will do.</p>
        </div>
        <button type="button" onClick={close} className="admin-guide-close" aria-label="Close guide">✕</button>
      </div>

      <div className="admin-guide-steps">
        {STEPS.map((step) => (
          <div className="admin-guide-step" key={step.title}>
            <span aria-hidden="true">{step.icon}</span>
            <div><strong>{step.title}</strong><p>{step.text}</p></div>
          </div>
        ))}
      </div>

      <details className="admin-guide-glossary">
        <summary>What do these words mean?</summary>
        <dl>
          {GLOSSARY.map(([term, meaning]) => (
            <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>
          ))}
        </dl>
      </details>

      <div className="admin-guide-foot">
        <span>
          {valueAllowed ? '✅ You can edit Values. ' : '⛔ Values editing is off for your role. '}
          {wikiAllowed ? '✅ You can edit the WIKI.' : '⛔ WIKI editing is off for your role.'}
        </span>
        <button type="button" onClick={close}>Got it, hide this</button>
      </div>
    </section>
  );
}
