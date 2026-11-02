// Compare dated worker markers numerically, so a later coordinated version is
// accepted without accidentally treating .10 as older than .2.
export function isWorkerAtLeast(actual, minimum) {
  const parse = (value) => {
    const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})\.(\d+)$/);
    return m ? m.slice(1).map(Number) : null;
  };
  const a = parse(actual); const b = parse(minimum);
  if (!a || !b) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}
