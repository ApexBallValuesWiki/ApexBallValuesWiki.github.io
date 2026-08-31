import { getUnitTags } from '../utils/unitTags';
import './UnitTags.css';

export default function UnitTags({ unit, limit = 3 }) {
  const tags = getUnitTags(unit);
  const visible = limit ? tags.slice(0, limit) : tags;
  if (!visible.length) return null;

  return (
    <div className="unit-tags">
      {visible.map((tag) => (
        <span key={tag} className="unit-tag">{tag}</span>
      ))}
      {tags.length > limit && <span className="unit-tag dim">+{tags.length - limit}</span>}
    </div>
  );
}
