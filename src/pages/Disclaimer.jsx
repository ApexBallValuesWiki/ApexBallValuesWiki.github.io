import { Link } from 'react-router-dom';
import { OPERATOR } from './Privacy';
import './Legal.css';

export default function Disclaimer() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <p className="legal-kicker">APEX WIKI &amp; VALUES</p>
        <h1>Fan-content &amp; IP disclaimer</h1>
        <p className="legal-lead">Who owns what, and how to request a takedown.</p>
        <p className="legal-updated">Last updated November 2, 2026</p>
      </header>

      <section className="legal-section">
        <h2>1. Not official</h2>
        <p><strong>Apex WIKI &amp; Values is an unofficial, fan-made, independently operated website.</strong> It is not affiliated with, endorsed by, sponsored by, authorised by, or operated by Roblox Corporation, Cash Grab Studios, or any developer, publisher or rights holder connected to Ball Tower Defense.</p>
      </section>

      <section className="legal-section">
        <h2>2. Trademarks and game assets</h2>
        <p>“Roblox” is a trademark of Roblox Corporation. “Ball Tower Defense”, the Cash Grab Studios name and logo, unit names, character artwork, icons, screenshots and other game materials are the property of their respective owners. They appear here solely for identification, commentary and reference under applicable fan-content and nominative-use principles. We do not claim ownership and we do not present them as official.</p>
        <p>This site is not a Roblox game, does not offer Robux, in-game items, account services, or official values, and does not ask for your Roblox credentials. Never share your Roblox password with anyone.</p>
      </section>

      <section className="legal-section">
        <h2>3. Values are community estimates</h2>
        <p>All trade values, demand ratings and tier descriptions are unofficial community estimates maintained by volunteers. They are not endorsed by the game’s creators, have no cash value, and must not be treated as an official price list or as financial advice.</p>
      </section>

      <section className="legal-section">
        <h2>4. Removal and rights-holder requests</h2>
        <p>If you are a rights holder and believe material on this site should be removed or credited differently, email <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> with the page URL, a description of the work, and your authority to act. We review and respond within {OPERATOR.sla} and remove material where appropriate. This is the site’s designated takedown channel.</p>
      </section>

      <section className="legal-section">
        <h2>5. Contact</h2>
        <p>Operator: {OPERATOR.name}, {OPERATOR.entity}, {OPERATOR.jurisdiction}. See the <Link to="/privacy">Privacy policy</Link>, <Link to="/cookies">Cookie notice</Link> and <Link to="/terms">Terms of use</Link>.</p>
      </section>
    </main>
  );
}
