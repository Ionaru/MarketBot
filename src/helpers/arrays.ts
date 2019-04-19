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
