import { Link } from 'react-router-dom';
import { OPERATOR, LAST_UPDATED } from '../data/operator';
import './Legal.css';

// A real, working contact channel. There is deliberately no contact FORM:
// a mixed-age audience should not be invited to type personal details into a
// web form, and no database should accumulate them. The mailbox below is the
// same one already published in the Privacy policy, Terms and Disclaimer.
export default function Contact() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <p className="legal-kicker">APEX WIKI &amp; VALUES</p>
        <h1>Contact</h1>
        <p className="legal-lead">One private channel, one named operator, one published response time. No forms, no accounts, no middlemen.</p>
        <p className="legal-updated">Last updated {LAST_UPDATED}</p>
      </header>
      <nav className="legal-index" aria-label="On this page">
        <a href="#email">Email</a><a href="#what">What to send</a><a href="#time">Response time</a><a href="#avoid">What not to send</a><a href="#other">Other pages</a>
      </nav>

      <section id="email" className="legal-section">
        <h2>1. Operator and email</h2>
        <p><strong>Operator:</strong> {OPERATOR.name} — {OPERATOR.entity}, based in {OPERATOR.jurisdiction}.</p>
        <p><strong>Private contact:</strong> <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. This mailbox is monitored by the operator, not by a support team or a third-party service.</p>
        <p>We do not publish a physical postal address. Where a legal formality requires one, it is supplied privately in the course of that request.</p>
      </section>

      <section id="what" className="legal-section">
        <h2>2. What to send here</h2>
        <p>Use this address for privacy or data requests, parental and child-safety questions, copyright and trademark removal notices, factual corrections to WIKI or values data, accessibility problems, and general questions about the site. If you are reporting a content error, including the page URL and the unit or item name helps us fix it faster.</p>
        <p>For rights-holder removal requests, please include the page URL, a description of the work and your authority to act. We review and respond within {OPERATOR.sla} and remove material where appropriate. This is the site's designated takedown channel; see the <Link to="/disclaimer">Fan-content &amp; IP disclaimer</Link>.</p>
      </section>

      <section id="time" className="legal-section">
        <h2>3. Response time</h2>
        <p>We acknowledge requests immediately and answer every request within <strong>{OPERATOR.sla}</strong>, free of charge, worldwide. The same deadline applies to all visitors regardless of where they live. Exercising a right never changes your access to the site.</p>
        <p>You may also complain to the Brazilian ANPD, the UK ICO, your EEA supervisory authority, the U.S. FTC, or your state attorney general. See <Link to="/privacy">Privacy policy §9</Link>.</p>
      </section>

      <section id="avoid" className="legal-section">
        <h2>4. What not to send</h2>
        <p>Please do not include passwords, bank or payment details, verification codes, full addresses, or other sensitive personal information. We will never ask for them. Children should ask a parent or guardian before writing to us.</p>
        <p>Do not post personal information in public bug reports or community channels — those are visible to other visitors.</p>
      </section>

      <section id="other" className="legal-section">
        <h2>5. Other useful pages</h2>
        <p><Link to="/about">About this site</Link> · <Link to="/privacy">Privacy policy</Link> · <Link to="/cookies">Cookie notice</Link> · <Link to="/terms">Terms of use</Link> · <Link to="/disclaimer">Fan-content &amp; IP disclaimer</Link> · <Link to="/credits">Credits</Link>.</p>
        <p>Use "Privacy choices" in the footer to change optional on-device settings at any time; that does not require contacting us.</p>
      </section>
    </main>
  );
}
