import { Link } from 'react-router-dom';
import { useState } from 'react';
import { clearApexLocalData, openPrivacyChoices } from '../utils/privacyChoices';
import { OPERATOR, LAST_UPDATED } from '../data/operator';
import './Legal.css';

const External = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>;
// Re-export keeps the other legal pages' existing imports working.
export { OPERATOR, LAST_UPDATED } from '../data/operator';

export default function Privacy() {
  const [cleared, setCleared] = useState(false);
  function clearLocal() {
    if (!window.confirm('Clear this site’s saved settings, game progress, local statistics, and editor session on this device? This cannot be undone.')) return;
    clearApexLocalData();
    setCleared(true);
  }

  return (
    <main className="legal-page">
      <header className="legal-header">
        <p className="legal-kicker">APEX WIKI &amp; VALUES</p>
        <h1>Privacy policy</h1>
        <p className="legal-lead">What this site collects, why, who is responsible, and how to exercise your rights.</p>
        <p className="legal-updated">Last updated {LAST_UPDATED}</p>
      </header>
      <nav className="legal-index" aria-label="On this page">
        <a href="#operator">Operator</a><a href="#data">What we collect</a><a href="#services">Services</a><a href="#storage">Cookies &amp; storage</a><a href="#ads">Advertising</a><a href="#children">Children</a><a href="#retention">Retention</a><a href="#transfers">Transfers</a><a href="#rights">Your rights</a>
      </nav>

      <section id="operator" className="legal-section">
        <h2>1. Who is responsible</h2>
        <p>Apex WIKI &amp; Values is an unofficial, independently operated, fan-made companion for the Roblox experience Ball Tower Defense. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation, Cash Grab Studios, or the game’s creators.</p>
        <p><strong>Controller / operator:</strong> {OPERATOR.name} — {OPERATOR.entity}, based in {OPERATOR.jurisdiction}. No physical postal address is published; please use the private contact channel below. Where a legal formality requires a guardian’s involvement it is handled privately and does not change who operates the site.</p>
        <p><strong>Private contact for privacy, parental, copyright and removal requests:</strong> <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. This mailbox is monitored by the operator. Do not post personal information in public bug reports or community channels.</p>
        <p><strong>Response time:</strong> we acknowledge requests immediately and answer every request within <strong>{OPERATOR.sla}</strong>, free of charge, worldwide. This single deadline is applied to all visitors regardless of where they live.</p>
      </section>

      <section id="data" className="legal-section">
        <h2>2. What we collect</h2>
        <p><strong>From public visitors: no personal data is collected by this site.</strong> There are no accounts, no sign-up, no contact form with free text, no analytics, no advertising identifiers, and no third-party fonts, images or time services. The optional on-device statistics feature is <strong>off by default</strong> and, if enabled, stays in your browser only.</p>
        <p>Unit images, fonts, stylesheets and scripts are served from this site’s own hosting. Links to Roblox, Discord, YouTube and other sites are ordinary hyperlinks: they load only when you choose to open them, and those services have their own policies.</p>
        <p><strong>From editors:</strong> the small team that maintains values uses an email address and a secret passcode held in Cloudflare KV. Editor sessions are short-lived and scoped to the browser tab. Editor identifiers are stripped from all publicly served data.</p>
      </section>

      <section id="services" className="legal-section">
        <h2>3. Hosting and service providers</h2>
        <p>The site is hosted on GitHub Pages. The shared values and WIKI database is served by a Cloudflare Worker with a KV namespace. When your browser loads any page, those providers necessarily receive ordinary network information such as IP address, request time, user agent and the requested resource, and apply their own security and log-retention practices.</p>
        <p>The site does not send personal data to any advertising, analytics, profiling, or data-broker service. It does not use WorldTimeAPI, TimeAPI.io, Google Fonts, Supabase-hosted images, or any other third-party asset host.</p>
        <p>One shared database serves both the public site and the Test Realm, so a value published by an editor on the Test Realm appears for production visitors. That database contains game values, unit descriptions and structured, non-identifying issue reports — not visitor profiles.</p>
      </section>

      <section id="storage" className="legal-section">
        <h2>4. Cookies, consent and on-device storage</h2>
        <p>The site sets <strong>no advertising or tracking cookies</strong>. It uses browser storage and a service-worker cache for essential purposes only: your chosen appearance and accessibility settings, offline assets, and game/achievement progress. These are necessary to run the site as you configured it and do not require consent.</p>
        <p>Optional on-device visit and search statistics are offered separately and are off until you opt in through the consent banner. Rejecting removes optional usage and recent-search history while keeping game progress. You can change your choice at any time via “Privacy choices” in the footer.</p>
        <p>We do not sell or share personal data, and we do not use data for automated decision-making or profiling.</p>
        <div className="legal-actions">
          <button type="button" onClick={openPrivacyChoices}>Change privacy choices</button>
          <button type="button" onClick={clearLocal}>Clear this app’s local data</button>
        </div>
        {cleared && <p className="legal-feedback" role="status">APEX-prefixed local and session storage was cleared where available. Refresh to apply. This does not erase server records or all browser caches.</p>}
        <p>Use your browser’s site-data controls to remove cookies, service-worker caches or storage. Clearing affects this browser/device only. Read the <Link to="/cookies">Cookie notice</Link> for details.</p>
      </section>

      <section id="ads" className="legal-section">
        <h2>5. Advertising</h2>
        <p><strong>Advertising is disabled in this build on both the public site and the Test Realm.</strong> No AdSense tag, advertising cookie, or advertising request is loaded. The Test Realm can never serve ads.</p>
        <p>If advertising is enabled after approval, the advertising partner will be <strong>Google AdSense</strong> (publisher <code>pub-2832011907708910</code>, as declared in <code>ads.txt</code>). Google and its partners may then use cookies, IP addresses or similar identifiers to deliver, measure and personalise ads, and may combine visits to this and other sites.</p>
        <p>That will only happen after a <strong>Google-certified consent platform</strong> is in place — Google's own free "Privacy &amp; messaging" CMP, not a paid third-party service — after the applicable child-safety settings are configured, and only for visitors who have opted in. The site requests <strong>non-personalised ads by default</strong> and never targets personalised advertising at children. You can withdraw or change consent at any time through the Google consent message and through "Privacy choices" in the footer.</p>
        <ul>
          <li><External href="https://business.safety.google/privacy/">How Google uses data from partner sites</External></li>
          <li><External href="https://myadcenter.google.com/">Google My Ad Center</External> and <External href="https://www.aboutads.info/choices/">aboutads.info choices</External></li>
          <li><External href="https://policies.google.com/technologies/partner-sites">Google's partner-site technologies</External> — the complete list of advertising partners and their privacy links.</li>
          <li><Link to="/cookies">Cookie notice</Link> — how consent and storage work on this site.</li>
        </ul>
        <p>An <code>ads.txt</code> file is present for publisher verification; its presence does not enable ads. See <Link to="/about">About this site</Link> for how the site is funded.</p>
      </section>

      <section id="children" className="legal-section">
        <h2>6. Children and families</h2>
        <p>This site is for a mixed-age audience that includes children and teenagers. We designed it so that children can use it without giving us personal data: no accounts, no free-text submissions, no behavioural advertising, no third-party asset hosts, and no optional statistics before consent.</p>
        <p>Because no personal information is collected from public visitors, no parental-consent or age-verification flow is required for ordinary browsing. A parent or guardian should still help a child with privacy choices and with external links to Roblox, Discord and YouTube. Parents or guardians may request access to, correction of, or deletion of any information they believe was submitted, using the contact above.</p>
        <p>We comply with Brazil’s LGPD (including Article 14 and the ECA Digital rules on the best interests of children and adolescents), the U.S. COPPA Rule, and applicable U.S. state privacy laws. We do not knowingly collect personal information from a child under 13 (U.S.) or a child under 12 (Brazil). If you believe such information was sent to us, contact us and we will delete it.</p>
      </section>

      <section id="retention" className="legal-section">
        <h2>7. Retention</h2>
        <p>On-device settings and progress remain until you clear them or your browser removes them. Structured, non-identifying issue reports and editor records in the shared database are kept only while needed to operate and audit the wiki, then removed or archived. Server and hosting logs are retained according to GitHub’s and Cloudflare’s own policies. A rollback snapshot of the previous database version is kept for recovery and is overwritten on the next change.</p>
      </section>

      <section id="transfers" className="legal-section">
        <h2>8. International transfers</h2>
        <p>GitHub and Cloudflare may process network information in countries other than yours, including the United States, under their own contractual and legal safeguards. We do not transfer visitor profiles because we do not create any.</p>
      </section>

      <section id="rights" className="legal-section">
        <h2>9. Your rights and how to complain</h2>
        <p>Under the LGPD, the GDPR/UK GDPR, COPPA and applicable U.S. state laws you may have the right to confirm whether data is processed, access it, correct it, delete it, restrict or object to processing, receive a portable copy, withdraw consent, and not be discriminated against for exercising a right. These rights are subject to applicable law and identity verification.</p>
        <p>To exercise any right, email <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> with the subject “Privacy request”. We answer within {OPERATOR.sla}. You may also complain to the Brazilian ANPD, the UK ICO, your EEA supervisory authority, the U.S. FTC, or your state attorney general.</p>
        <p>See also the <Link to="/terms">Terms of use</Link>, the <Link to="/cookies">Cookie notice</Link> and the <Link to="/disclaimer">Fan-content &amp; IP disclaimer</Link>.</p>
      </section>
    </main>
  );
}
