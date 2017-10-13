export function formatNumber(amount: number | string, decimals = 2, decimalMark = '.', delimiter = ','): string {

  let amountNumber = Number(amount);

  if (isNaN(amountNumber)) {
    amountNumber = 0;
  }

  let negativeMarker = '';

  if (amountNumber < 0) {
    negativeMarker = '-';
  }

  const absoluteNumber = Math.abs(amountNumber).toFixed(decimals);

  let i: any;
  let j: any;

  i = parseInt(absoluteNumber, 10) + '';
  const digits = i.length;
  j = (j = digits) > 3 ? j % 3 : 0;
  return negativeMarker + (j ? i.substr(0, j) + delimiter : '') +
    i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + delimiter) +
    (decimals ? decimalMark + Math.abs(Number(absoluteNumber) - i).toFixed(decimals).slice(2) : '');
}

export function pluralize(singular: string, plural: string, amount: number): string {
  if (amount === 1) {
    return singular;
  }
  return plural;
}
