import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import quietTextHover from './quiet-text-hover.mjs';

async function apply(css) {
  return (await postcss([quietTextHover()]).process(css, { from: undefined })).css;
}

describe('quiet text hover policy', () => {
  it('keeps the normal foreground and background together instead of inverting text', async () => {
    const css = await apply('.button:hover { color: #000; background: white; transform: translateY(-2px); border-color: red; }');
    expect(css).not.toContain('color: #000');
    expect(css).not.toContain('background: white');
    expect(css).not.toContain('transform:');
    expect(css).toContain('border-color: red');
  });

  it('preserves non-hover selected/focus rules when selectors are grouped', async () => {
    const css = await apply('.choice:hover, .choice.selected, .choice:focus-visible { color: white; border-color: blue; }');
    expect(css).toMatch(/\.choice\.selected, \.choice:focus-visible\s*\{\s*color: white/);
    expect(css).toMatch(/\.choice:hover\s*\{\s*border-color: blue/);
  });

  it('keeps decorative icon motion and option background highlighting', async () => {
    const css = await apply('.link:hover .cool-icon { transform: translateX(3px); color: red; } .option:hover { background: #333; }');
    expect(css).toContain('transform: translateX(3px)');
    expect(css).toContain('background: #333');
  });
});
