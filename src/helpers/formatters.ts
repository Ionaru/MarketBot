export function formatNumber(amount: number | string, decimals = 2, decimalMark = '.', delimiter = ','): string {
  let i: any, j: any, n: any, s: any;
  n = Number(amount);
  s = n < 0 ? '-' : '';
  i = parseInt(n = Math.abs(+n || 0).toFixed(decimals), 10) + '';
  j = (j = i.length) > 3 ? j % 3 : 0;
  return s + (j ? i.substr(0, j) + delimiter : '') +
    i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + delimiter) +
    (decimals ? decimalMark + Math.abs(n - i).toFixed(decimals).slice(2) : '');
}

export function pluralize(singular: string, plural: string, amount: number): string {
  if (amount === 1) {
    return singular;
  }
  return plural;
}
