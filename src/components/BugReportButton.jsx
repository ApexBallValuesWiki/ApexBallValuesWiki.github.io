import { NavLink } from 'react-router-dom';
import './BugReportButton.css';

export default function BugReportButton() {
  return (
    <NavLink
      to="/bug-report"
      className={({ isActive }) => (isActive ? 'global-bug-report active' : 'global-bug-report')}
      aria-label="Report a bug"
    >
      <span className="global-bug-report-icon" aria-hidden="true">!</span>
      <span>Report Bug</span>
    </NavLink>
  );
}
