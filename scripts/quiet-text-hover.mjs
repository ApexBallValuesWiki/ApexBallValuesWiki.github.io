// Preserve focus/active states and decorative icon feedback while keeping text
// still on pointer hover. Centralizing this in the CSS pipeline also covers
// lazily loaded pages without forcing every link to share one color.
function isDecorativeTarget(selector) {
  const last = selector.trim().split(/\s+|\s*[>+~]\s*/).filter(Boolean).at(-1) || '';
  return /::(?:before|after)\b/i.test(last)
    || /^(?:svg|path|img|canvas)\b/i.test(last)
    || /(?:^|[.#_-])(?:icon|glyph|chev(?:ron)?|arrow|cutout|art|image|img|glow|ring|dot|spark|spinner)(?:[.#_:>-]|$)/i.test(last);
}

const affectsText = /^(?:color|opacity|filter|transform|translate|scale|rotate|animation(?:-.+)?|font(?:-.+)?|letter-spacing|line-height|text-decoration(?:-.+)?|text-shadow)$/i;
const background = /^(?:background|background-color|background-image)$/i;

export default function quietTextHover() {
  return {
    postcssPlugin: 'apex-quiet-text-hover',
    Once(root) {
      const rules = [];
      root.walkRules((rule) => rules.push(rule));
      for (const rule of rules) {
        const hoverText = [];
        const untouched = [];
        for (const selector of rule.selectors || []) {
          const isHover = /:hover\b/.test(selector) && !/:not\([^)]*:hover/.test(selector);
          (isHover && !isDecorativeTarget(selector) ? hoverText : untouched).push(selector);
        }
        if (!hoverText.length) continue;
        if (untouched.length) rule.before(rule.clone({ selector: untouched.join(', ') }));
        rule.selector = hoverText.join(', ');
        // If a hover inverts text and background together, keep BOTH normal
        // values so that removing the color change cannot destroy contrast.
        const changesColor = rule.nodes?.some((node) => node.type === 'decl' && node.prop.toLowerCase() === 'color');
        rule.walkDecls((decl) => {
          if (affectsText.test(decl.prop) || (changesColor && background.test(decl.prop))) decl.remove();
        });
        if (!rule.nodes?.length) rule.remove();
      }
    },
  };
}
