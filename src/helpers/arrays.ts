export function sortArrayByObjectPropertyLength(array: any[], property: string, inverse = false): any[] {
  function compare(a: any, b: any) {
    if (a[property].length < b[property].length) {
      return inverse ? 1 : -1;
    }
    if (a[property].length > b[property].length) {
      return inverse ? -1 : 1;
    }
    return 0;
  }

  return array.sort(compare);
}

export function sortArrayByObjectProperty(array: any[], property: string, inverse = false): any[] {
  function compare(a: any, b: any) {
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
