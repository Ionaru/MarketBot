export function sortArrayByObjectPropertyLength(array: Array<any>, p1: string, p2: string, inverse = false): Array<any> {
  function compare(a, b) {
    if (a[p1][p2].length < b[p1][p2].length) {
      return inverse ? 1 : -1;
    }
    if (a[p1][p2].length > b[p1][p2].length) {
      return inverse ? -1 : 1;
    }
    return 0;
  }

  return array.sort(compare);
}

export function sortArrayByObjectProperty(array: Array<any>, property: string, inverse = false): Array<any> {
  function compare(a, b) {
    if (a[property] < b[property]) {
      return inverse ? 1 : -1;
    }
    if (a[property] > b[property]) {
      return inverse ? -1 : 1;
    }
    return 0;
  }

  return array.sort(compare);
}
