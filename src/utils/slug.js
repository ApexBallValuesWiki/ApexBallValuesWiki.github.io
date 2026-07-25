export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
