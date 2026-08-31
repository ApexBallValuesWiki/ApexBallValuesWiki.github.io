/**
 * Accessibility — color contrast checking, WCAG AA compliance
 */

// Check if two colors meet WCAG AA contrast ratio (4.5:1 for normal text)
export function meetsWCAGAA(fg, bg) {
  const ratio = getContrastRatio(fg, bg);
  return ratio >= 4.5;
}

// Get contrast ratio between two colors
export function getContrastRatio(fg, bg) {
  const lum1 = getLuminance(fg);
  const lum2 = getLuminance(bg);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Get relative luminance of a color
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Convert hex to RGB
function hexToRgb(hex) {
  const cleaned = String(hex).trim().replace('#', '');
  if (cleaned.length === 3) {
    return [parseInt(cleaned[0] + cleaned[0], 16), parseInt(cleaned[1] + cleaned[1], 16), parseInt(cleaned[2] + cleaned[2], 16)];
  }
  if (cleaned.length === 6) {
    return [parseInt(cleaned.slice(0, 2), 16), parseInt(cleaned.slice(2, 4), 16), parseInt(cleaned.slice(4, 6), 16)];
  }
  return null;
}

// Check theme colors for accessibility issues
export function checkThemeAccessibility(theme) {
  const issues = [];
  const colors = theme?.colors || {};

  if (colors.text && colors.bg && !meetsWCAGAA(colors.text, colors.bg)) {
    issues.push({ type: 'contrast', message: 'Text on background does not meet WCAG AA', ratio: getContrastRatio(colors.text, colors.bg).toFixed(2) });
  }

  if (colors.textDim && colors.bg && !meetsWCAGAA(colors.textDim, colors.bg)) {
    issues.push({ type: 'contrast', message: 'Dim text on background does not meet WCAG AA', ratio: getContrastRatio(colors.textDim, colors.bg).toFixed(2) });
  }

  if (colors.accent && colors.bg && !meetsWCAGAA(colors.accent, colors.bg)) {
    issues.push({ type: 'contrast', message: 'Accent on background does not meet WCAG AA', ratio: getContrastRatio(colors.accent, colors.bg).toFixed(2) });
  }

  return issues;
}
