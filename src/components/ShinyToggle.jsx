import { Link } from 'react-router-dom';

// SHINY TOGGLE — the reimagined Base ↔ Shiny switch on unit pages. A real,
// visible segmented control instead of the old hidden star button. Renders
// nothing when the unit has no shiny counterpart.
export default function ShinyToggle({ isShiny, counterpartLink, basePath = '/wiki' }) {
  if (!counterpartLink) return null;
  return (
    <div className="shiny-toggle" role="group" aria-label="Switch between Base and Shiny variant">
      <Link
        to={counterpartLink}
        className={`shiny-toggle-side${!isShiny ? ' active' : ''}`}
        aria-current={!isShiny ? 'true' : undefined}
      >
        ⭐ Base
      </Link>
      <Link
        to={counterpartLink}
        className={`shiny-toggle-side shiny${isShiny ? ' active' : ''}`}
        aria-current={isShiny ? 'true' : undefined}
      >
        ✨ Shiny
      </Link>
    </div>
  );
}
