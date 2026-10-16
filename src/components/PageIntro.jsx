import ThemeCutout from './ThemeCutout';
import './PageIntro.css';

function pickCutoutVariant(eyebrow = '', title = '', custom) {
  if (custom) return custom;
  const text = `${eyebrow} ${title}`.toLowerCase();
  if (text.includes('value') || text.includes('market')) return 'poseidon';
  if (text.includes('trade') || text.includes('calculator')) return 'king';
  if (text.includes('wiki') || text.includes('database') || text.includes('encyclopedia')) return 'overlord';
  if (text.includes('leaderboard') || text.includes('ranking')) return 'laserminigunner';
  if (text.includes('compare') || text.includes('search')) return 'hacker';
  if (text.includes('arcade') || text.includes('knowledge') || text.includes('minigame')) return 'partyman';
  if (text.includes('achievement')) return 'drone';
  if (text.includes('credit') || text.includes('team')) return 'elfcommander';
  if (text.includes('theme') || text.includes('changelog')) return 'forest';
  return 'overlord';
}

export default function PageIntro({
  eyebrow,
  title,
  children,
  actions = null,
  className = '',
  cutoutVariant,
}) {
  const variant = pickCutoutVariant(eyebrow, title, cutoutVariant);

  return (
    <section className={className ? `page-intro ${className}` : 'page-intro'}>
      <ThemeCutout
        variant={variant}
        floating
        className="page-intro-cutout"
      />
      <div className="page-intro-copy">
        {title && <h1>{title}</h1>}
        {children && <div className="page-intro-body">{children}</div>}
      </div>
      {actions && <div className="page-intro-actions">{actions}</div>}
    </section>
  );
}
