/* tslint:disable:no-big-function */

import { sortArrayByObjectPropertyLength } from './arrays';

describe('sortArrayByObjectPropertyLength()', () => {
    const unsortedArray = [
        {value: '12345'},
        {value: '12'},
        {value: '1'},
        {value: '123'},
        {value: '1234'},
    ];

    test('should sort the array by the object property length', () => {
        const sortedArray = sortArrayByObjectPropertyLength(unsortedArray, 'value');

        expect(sortedArray).toStrictEqual([
            {value: '1'},
            {value: '12'},
            {value: '123'},
            {value: '1234'},
            {value: '12345'},
        ]);
    });

    test('should reverse sort the array by the object property length', () => {
        const sortedArray = sortArrayByObjectPropertyLength(unsortedArray, 'value', true);

        expect(sortedArray).toStrictEqual([
            {value: '12345'},
            {value: '1234'},
            {value: '123'},
            {value: '12'},
            {value: '1'},
        ]);
    });

    test('should sort the array by the object property length with equal length values', () => {
        const unsortedArrayWithEqualValues = [
            {value: '12345'},
            {value: '12'},
            {value: '1'},
            {value: '123'},
            {value: '1234'},
            {value: '12'},
        ];

        const sortedArray = sortArrayByObjectPropertyLength(unsortedArrayWithEqualValues, 'value');

        expect(sortedArray).toStrictEqual([
            {value: '1'},
            {value: '12'},
            {value: '12'},
            {value: '123'},
            {value: '1234'},
            {value: '12345'},
        ]);
    });

    test('should reverse sort the array by the object property length with equal length values', () => {
        const unsortedArrayWithEqualValues = [
            {value: '12345'},
            {value: '12'},
            {value: '1'},
            {value: '123'},
            {value: '1234'},
            {value: '12'},
        ];

        const sortedArray = sortArrayByObjectPropertyLength(unsortedArrayWithEqualValues, 'value', true);

        expect(sortedArray).toStrictEqual([
            {value: '12345'},
            {value: '1234'},
            {value: '123'},
            {value: '12'},
            {value: '12'},
            {value: '1'},
        ]);
    });
});
