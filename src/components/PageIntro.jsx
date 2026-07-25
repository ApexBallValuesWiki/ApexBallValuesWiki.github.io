import './PageIntro.css';

export default function PageIntro({ eyebrow, title, children, actions = null, className = '' }) {
  return (
    <section className={className ? `page-intro ${className}` : 'page-intro'}>
      <div className="page-intro-copy">
        {eyebrow && <p className="page-intro-eyebrow">{eyebrow}</p>}
        {title && <h1>{title}</h1>}
        {children && <div className="page-intro-body">{children}</div>}
      </div>
      {actions && <div className="page-intro-actions">{actions}</div>}
    </section>
  );
}
