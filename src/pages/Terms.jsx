import { Link } from 'react-router-dom';
import { OPERATOR } from '../data/operator';
import './Legal.css';

export default function Terms() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <p className="legal-kicker">APEX WIKI &amp; VALUES</p>
        <h1>Terms of use</h1>
        <p className="legal-lead">The ground rules for this community-made Ball Tower Defense companion.</p>
        <p className="legal-updated">Last updated November 2, 2026</p>
      </header>

      <section className="legal-section">
        <h2>1. Who we are and acceptance</h2>
        <p>Apex WIKI &amp; Values is operated by {OPERATOR.name} ({OPERATOR.entity}, {OPERATOR.jurisdiction}). By using the site you accept these terms. If you do not agree, please stop using it. Contact: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.</p>
        <p>These terms are governed by the laws of the Federative Republic of Brazil. Nothing here limits rights that cannot lawfully be limited, including consumer and data-protection rights.</p>
      </section>

      <section className="legal-section">
        <h2>2. An unofficial fan project</h2>
        <p>This is an independent, fan-made, non-commercial reference site. It is <strong>not affiliated with, endorsed by, sponsored by, or operated by Roblox Corporation, Cash Grab Studios, or the creators of Ball Tower Defense</strong>. “Roblox”, the Ball Tower Defense name, game artwork, characters, logos and trademarks belong to their respective owners and are used only to identify the game this site describes. No official content is reproduced as our own.</p>
        <p>Read the <Link to="/disclaimer">Fan-content &amp; IP disclaimer</Link> for the full notice and the removal process. Rights holders may request removal at the address above; we act on valid requests within {OPERATOR.sla}.</p>
      </section>

      <section className="legal-section">
        <h2>3. Information and trade estimates</h2>
        <p>Unit information and trading values are community-maintained estimates. They may be incomplete, outdated or wrong, and they can change without notice. The trade calculator is a guide, not a guarantee of a trade, outcome, price, or in-game value. Nothing on this site is financial, legal or investment advice. Make your own decisions and verify information in the game.</p>
      </section>

      <section className="legal-section">
        <h2>4. Use the site responsibly</h2>
        <p>Do not interfere with the service, attempt unauthorised access to the editor area or database, submit malicious material, scrape at a rate that harms availability, or impersonate others. The report form accepts predefined, non-identifying issue categories only; do not submit personal or sensitive information through it. Children and teenagers should involve a parent or guardian when using online services.</p>
      </section>

      <section className="legal-section">
        <h2>5. Community content</h2>
        <p>Creators retain the rights to their own work. The team publishes community material only with appropriate permission and provides a removal route for copyright and other concerns. If you believe something on this site infringes your rights, email the operator with the page URL and a description of the work; we will review and remove it where appropriate.</p>
      </section>

      <section className="legal-section">
        <h2>6. Availability, links and changes</h2>
        <p>The site and its information are provided as available and may change or become unavailable at any time. Links to Roblox, Discord, YouTube and other services are provided for convenience; those services have their own terms and privacy practices and we are not responsible for them.</p>
        <p>We may update these terms. The “Last updated” date above always reflects the current version. See the <Link to="/privacy">Privacy policy</Link> and <Link to="/cookies">Cookie notice</Link> for data practices and consent controls.</p>
      </section>
    </main>
  );
}
