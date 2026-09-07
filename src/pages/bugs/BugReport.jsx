import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageIntro from '../../components/PageIntro';
import { APEX_KV_URL } from '../../utils/apexClient';
import { incrementStat } from '../../utils/achievements';
import './BugReport.css';

const BUG_CATEGORIES = [
  'Wrong Data',
  'Broken Link',
  'UI/Display Issue',
  'Missing Information',
  'Performance',
  'Crash/Error',
  'Other',
];

export default function BugReport() {
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    page_url: '',
    contact: '',
    browser: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      setError('Please enter a title for the bug report.');
      return;
    }
    if (!form.description.trim()) {
      setError('Please describe the bug you encountered.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${APEX_KV_URL}/bug-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim().slice(0, 200),
          category: form.category || null,
          description: form.description.trim().slice(0, 2000),
          page_url: form.page_url || window.location.href,
          contact: form.contact?.trim() ? form.contact.trim().slice(0, 200) : null,
          browser: form.browser?.trim() ? form.browser.trim().slice(0, 200) : null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        setError(`Failed to submit: ${err.error || 'Server error'}`);
      } else {
        setSubmitted(true);
      incrementStat('bugs_reported', 1);
        setForm({
          title: '',
          category: '',
          description: '',
          page_url: '',
          contact: '',
          browser: '',
        });
      }
    } catch (err) {
      setError(`Unable to submit bug report: ${err.message}`);
    }

    setSubmitting(false);
  }

  if (submitted) {
    return (
      <main className="bug-report-page">
        <PageIntro eyebrow="Testing Support" title="Report Submitted!">
          <p>Thank you for helping improve the Test Realm! Your bug report has been received.</p>
        </PageIntro>
        <div className="card bug-report-success">
          <p>
            Your report helps make Testing better for everyone.
          </p>
          <div className="bug-report-success-actions">
            <button type="button" className="filled" onClick={() => setSubmitted(false)}>
              Submit Another Report
            </button>
            <Link to="/" className="button-link">
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bug-report-page">
      <PageIntro eyebrow="Testing Support" title="Report a Bug">
        <p>
          Found something wrong? Let us know! Fill out this form to report bugs, incorrect data,
          broken links, or anything else.
        </p>
      </PageIntro>

      <motion.form
        onSubmit={handleSubmit}
        className="card bug-report-form"
        style={{ padding: 'clamp(18px, 3vw, 28px)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bug-report-fields">
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Title <span style={{ color: 'var(--text-faint)' }}>*</span>
            </span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Brief description of the issue"
              required
              maxLength={200}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
              {form.title.length}/200 characters
            </span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Category</span>
            <select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            >
              <option value="">Select a category…</option>
              {BUG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Description <span style={{ color: 'var(--text-faint)' }}>*</span>
            </span>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Please describe what happened, what you expected to happen, and steps to reproduce the issue…"
              required
              maxLength={2000}
              rows={5}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.95rem',
                resize: 'vertical',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
              {form.description.length}/2000 characters
            </span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Page URL</span>
            <input
              type="url"
              value={form.page_url}
              onChange={(e) => updateField('page_url', e.target.value)}
              placeholder="URL where the bug occurred"
              style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Browser/Device (optional)</span>
            <input
              type="text"
              value={form.browser}
              onChange={(e) => updateField('browser', e.target.value)}
              placeholder="e.g., Chrome 120 on Windows 11"
              maxLength={200}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Contact (optional)</span>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => updateField('contact', e.target.value)}
              placeholder="Email or Discord for follow-up (not shown publicly)"
              maxLength={200}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
              Only visible to admins. We may use this to ask for more details.
            </span>
          </label>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255, 77, 77, 0.1)',
              border: '1px solid rgba(255, 77, 77, 0.3)',
              borderRadius: 'var(--radius)',
              color: '#ff6b6b',
              fontSize: '0.88rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              className="filled"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {submitting ? 'Submitting…' : 'Submit Bug Report'}
            </button>
            <button
              type="button"
              onClick={() => setForm({
                title: '',
                category: '',
                description: '',
                page_url: '',
                contact: '',
                browser: '',
              })}
              disabled={submitting}
            >
              Clear
            </button>
          </div>
        </div>
      </motion.form>

      <p className="bug-report-footnote">
        Reports are reviewed by admins. For urgent issues, reach out directly on Discord.
      </p>
    </main>
  );
}
