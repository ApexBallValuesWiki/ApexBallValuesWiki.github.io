export function encodeRouteParam(value = '') {
  const str = String(value);
  if (str === '???') return 'Secret';
  if (str === 'Shiny ???') return 'Shiny-Secret';
  return encodeURIComponent(str);
}

export function decodeRouteParam(value = '') {
  if (value === 'Secret') return '???';
  if (value === 'Shiny-Secret') return 'Shiny ???';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
