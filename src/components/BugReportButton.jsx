import { NavLink } from 'react-router-dom';
import './BugReportButton.css';

export default function BugReportButton() {
  return (
    <NavLink
      to="/bug-report"
      className={({ isActive }) => `global-bug-report${isActive ? ' active' : ''}`}
      aria-label="Report a bug"
      title="Report a bug"
    >
      <span className="global-bug-report-icon" aria-hidden="true">!</span>
      <span>Report Bug</span>
    </NavLink>
  );
}
