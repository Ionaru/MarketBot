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

    function checkComparingTypes(left: any, right: any) {
        if (left === undefined || right === undefined) {
            throw new Error(`Unable to compare values '${left}' and '${right}'`);
        }

        if (typeof left !== typeof right) {
            throw new Error(`Unable to compare different types: '${left}' (${typeof left}) and '${right}' (${typeof right})`);
        }
    }

    const compare = (a: T, b: T) => {
        const getObjectValue = (object: any, key: string): any => object[key];
        let left = property.split('.').reduce(getObjectValue, a);
        let right = property.split('.').reduce(getObjectValue, b);

        checkComparingTypes(left, right);

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
