import { Link } from 'react-router-dom';
import { openPrivacyChoices } from '../utils/privacyChoices';
import { OPERATOR } from './Privacy';
import './Legal.css';

export default function Cookies() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <p className="legal-kicker">APEX WIKI &amp; VALUES</p>
        <h1>Cookie &amp; storage notice</h1>
        <p className="legal-lead">A plain-language list of what is stored on your device and how to control it.</p>
        <p className="legal-updated">Last updated November 2, 2026</p>
      </header>

      <section className="legal-section">
        <h2>1. No tracking cookies</h2>
        <p>This site does not set advertising, analytics, profiling or cross-site tracking cookies. It does not load third-party fonts, images, time services, or advertising scripts in this build. There is no account system for public visitors.</p>
      </section>

      <section className="legal-section">
        <h2>2. What is stored (essential)</h2>
        <p>Browser <code>localStorage</code> / <code>sessionStorage</code> and a service-worker cache are used for: your theme and accessibility settings, offline assets, game and achievement progress, and (for editors only) a short-lived, tab-scoped session. These are strictly necessary to run the site as you configured it and do not require consent.</p>
        <p>We use <code>sessionStorage</code> for editor credentials so they are never persisted beyond the browser tab and expire automatically. Editor secrets are not placed in <code>localStorage</code>.</p>
      </section>

      <section className="legal-section">
        <h2>3. Optional storage (consent required)</h2>
        <p>Optional on-device visit and search statistics are <strong>off by default</strong> and are only written after you opt in. Advertising cookies are also off by default and are only used if advertising is enabled in a future release and you opt in. Nothing optional is written before a choice is made.</p>
        <div className="legal-actions"><button type="button" onClick={openPrivacyChoices}>Change privacy choices</button></div>
      </section>

      <section className="legal-section">
        <h2>4. Withdrawing consent and deleting data</h2>
        <p>Use “Privacy choices” in the footer to withdraw or change consent at any time. Withdrawing removes optional usage and recent-search history but keeps your game progress. Your browser’s site-data controls can delete all cookies, storage and caches for this site. The <Link to="/privacy">Privacy policy</Link> includes a “Clear this app’s local data” action and explains what it does and does not remove.</p>
      </section>

      <section className="legal-section">
        <h2>5. Third parties</h2>
        <p>Only GitHub Pages (hosting) and Cloudflare (the shared values database) receive ordinary network information required to deliver the site. If advertising is enabled later, Google and its partners will be listed here and in the privacy policy before any ad request is made, together with a certified consent platform and opt-out links.</p>
      </section>

      <section className="legal-section">
        <h2>6. Contact</h2>
        <p>Questions about cookies or storage: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. We answer within {OPERATOR.sla}. See also the <Link to="/terms">Terms of use</Link>.</p>
      </section>
    </main>
  );
}
