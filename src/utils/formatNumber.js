export function formatCompactNumber(val, decimals = 1) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1e12) {
    const formatted = (abs / 1e12).toFixed(decimals).replace(/\.0$/, '');
    return `${sign}${formatted}T`;
  }
  if (abs >= 1e9) {
    const formatted = (abs / 1e9).toFixed(decimals).replace(/\.0$/, '');
    return `${sign}${formatted}B`;
  }
  if (abs >= 1e6) {
    const formatted = (abs / 1e6).toFixed(decimals).replace(/\.0$/, '');
    return `${sign}${formatted}M`;
  }
  if (abs >= 1e3) {
    const formatted = (abs / 1e3).toFixed(decimals).replace(/\.0$/, '');
    return `${sign}${formatted}K`;
  }
  return `${sign}${num.toLocaleString()}`;
}

export function formatFullNumber(val) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}
