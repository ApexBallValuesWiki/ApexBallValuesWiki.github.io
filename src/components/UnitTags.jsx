import { getUnitTags } from '../utils/unitTags';
import './UnitTags.css';

export default function UnitTags({ unit, limit = null }) {
  const tags = getUnitTags(unit);
  const visible = limit ? tags.slice(0, limit) : tags;
  if (!visible.length) return null;

  return (
    <div className="unit-tags">
      {visible.map((tag) => (
        <span key={tag} className="unit-tag">{tag}</span>
      ))}
      {limit && tags.length > limit && <span className="unit-tag dim">+{tags.length - limit}</span>}
    </div>
  );
}
