import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageIntro from '../../components/PageIntro';
import Dropdown from '../../components/Dropdown';
import { APEX_KV_URL } from '../../utils/apexClient';
import './BugReport.css';

// Fixed selections prevent the form from asking children (or anyone else) for
// names, contact information, free text, URLs, or other personal details.
const CATEGORIES = ['Wrong Data', 'Broken Link', 'UI/Display Issue', 'Missing Information', 'Performance', 'Crash/Error', 'Other'];
const AREAS = ['Home', 'Wiki', 'Values', 'Trade Calculator', 'Minigames', 'Other'];

export default function BugReport() {
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!CATEGORIES.includes(category) || !AREAS.includes(area)) {
      setError('Choose an issue type and an area first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${APEX_KV_URL}/bug-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The extra fixed strings keep the report legible on older workers;
        // the updated worker reconstructs them from its own allow-lists.
        body: JSON.stringify({
          type: 'structured-v1', category, area,
          title: `${category} — ${area}`,
          description: `Issue: ${category}; area: ${area}.`,
          page_url: '', contact: null, browser: null,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Could not send the report.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not send the report. Try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="bug-report-page">
        <PageIntro title="Report received" cutoutVariant="drone"><p>Thanks for helping improve the site.</p></PageIntro>
        <div className="card bug-report-success">
          <p>Your selected issue and area were sent to the team. No contact details were requested.</p>
          <div className="bug-report-success-actions">
            <button type="button" className="filled" onClick={() => { setSubmitted(false); setCategory(''); setArea(''); }}>Send another</button>
            <Link to="/" className="button-link">Return home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bug-report-page">
      <PageIntro title="Report a bug" cutoutVariant="drone">
        <p>Choose the kind of problem and where you noticed it. Please do not send personal information.</p>
      </PageIntro>
      <form className="card bug-report-form" onSubmit={submit}>
        <div className="bug-report-fields">
          <div>
            <label className="bug-select-label" htmlFor="bug-category">What happened?</label>
            <Dropdown id="bug-category" ariaLabel="Issue type" value={category} onChange={setCategory} options={CATEGORIES.map((value) => ({ value, label: value }))} placeholder="Choose an issue type" />
          </div>
          <div>
            <label className="bug-select-label" htmlFor="bug-area">Where did it happen?</label>
            <Dropdown id="bug-area" ariaLabel="Site area" value={area} onChange={setArea} options={AREAS.map((value) => ({ value, label: value }))} placeholder="Choose an area" />
          </div>
          {error && <p className="bug-report-error" role="alert">{error}</p>}
          <button type="submit" className="filled" disabled={submitting}>{submitting ? 'Sending…' : 'Send report'}</button>
        </div>
      </form>
      <p className="bug-report-footnote">Only your choices are included in the report. The network provider may receive normal request information such as an IP address. <Link to="/privacy">Privacy &amp; storage</Link></p>
    </main>
  );
}
