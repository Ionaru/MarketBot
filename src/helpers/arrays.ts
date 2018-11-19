export function sortArrayByObjectPropertyLength<T>(array: T[], property: string, inverse = false): T[] {
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

export function sortArrayByObjectProperty<T>(array: T[], property: string, inverse = false): T[] {

  const compare = (a: any, b: any) => {
    let left = property.split('.').reduce((o, i) =>  o ? o[i] : o, a);
    let right = property.split('.').reduce((o, i) =>  o ? o[i] : o, b);

    if (left === undefined || right === undefined) {
      throw new Error(`Unable to compare values '${left}' and '${right}'`);
    }

    if (typeof left !== typeof right) {
      throw new Error(`Unable to compare different types: '${left}' (${typeof left}) and '${right}' (${typeof right})`);
    }

    // We know the types are the same, but it's better to make absolutely sure.
    if (typeof left === 'string' && typeof right === 'string') {
      left = left.toUpperCase();
      right = right.toUpperCase();
    }

    if (left < right) {
      return inverse ? 1 : -1;
    }
    if (left > right) {
      return inverse ? -1 : 1;
    }
    return 0;
  };

  return array.sort(compare);
}
