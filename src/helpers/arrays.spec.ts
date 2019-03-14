/* tslint:disable:no-big-function */

import { sortArrayByObjectProperty, sortArrayByObjectPropertyLength } from './arrays';

describe('Array sorting', () => {

  describe('sortArrayByObjectProperty()', () => {
    const unsortedArray = [
      {value: 2},
      {value: 3},
      {value: 0},
      {value: 4},
      {value: 1},
    ];

    test('Sorting an array with only one value', () => {
      const sortedArray = sortArrayByObjectProperty([{value: 3}], 'value');

      expect(sortedArray).toStrictEqual([{value: 3}]);
    });

    test('Reverse sorting an array with only one value', () => {
      const sortedArray = sortArrayByObjectProperty([{value: 3}], 'value', true);

      expect(sortedArray).toStrictEqual([{value: 3}]);
    });

    test('Sorting an array by object property', () => {
      const sortedArray = sortArrayByObjectProperty(unsortedArray, 'value');

      expect(sortedArray).toStrictEqual([
        {value: 0},
        {value: 1},
        {value: 2},
        {value: 3},
        {value: 4},
      ]);
    });

    test('Reverse sorting an array by object property', () => {
      const sortedArray = sortArrayByObjectProperty(unsortedArray, 'value', true);

      expect(sortedArray).toStrictEqual([
        {value: 4},
        {value: 3},
        {value: 2},
        {value: 1},
        {value: 0},
      ]);
    });

    test('Sort an array with some equal values', () => {
      const unsortedArrayWithEqualValue = [
        {value: 2},
        {value: 3},
        {value: 2},
        {value: 4},
        {value: 1},
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValue, 'value');

      expect(sortedArray).toStrictEqual([
        {value: 1},
        {value: 2},
        {value: 2},
        {value: 3},
        {value: 4},
      ]);
    });

    test('Sorting an array with only equal values', () => {
      const unsortedArrayWithEqualValues = [
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValues, 'value');

      expect(sortedArray).toStrictEqual([
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
      ]);
    });

    test('Reverse sorting an array with only equal values', () => {
      const unsortedArrayWithEqualValues = [
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValues, 'value', true);

      expect(sortedArray).toStrictEqual([
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
        {value: 2},
      ]);
    });

    test('Reverse sort an array with some equal values', () => {
      const unsortedArrayWithEqualValue = [
        {value: 2},
        {value: 3},
        {value: 2},
        {value: 4},
        {value: 1},
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValue, 'value', true);

      expect(sortedArray).toStrictEqual([
        {value: 4},
        {value: 3},
        {value: 2},
        {value: 2},
        {value: 1},
      ]);
    });

    test('Attempting to sort an undefined value in an array must throw an error', () => {
      const unsortedArrayWithUndefinedValue = [
        {value: 2},
        {value: 3},
        {value: undefined},
        {value: 4},
        {value: 1},
      ];

      expect(() => {
        sortArrayByObjectProperty(unsortedArrayWithUndefinedValue, 'value');
      }).toThrow(new Error('Unable to compare values \'3\' and \'undefined\''));
    });

    test('Attempting to sort a string value in an array must throw an error', () => {
      const unsortedArrayWithStringValue = [
        {value: 2},
        {value: 3},
        {value: '2'},
        {value: 4},
        {value: 1},
      ];

      expect(() => {
        sortArrayByObjectProperty(unsortedArrayWithStringValue, 'value');
      }).toThrow(new Error('Unable to compare different types: \'3\' (number) and \'2\' (string)'));
    });

    test('Sort an array with string values', () => {
      const unsortedArrayWithStringValues = [
        {value: '2'},
        {value: '3'},
        {value: '2'},
        {value: '4'},
        {value: '1'},
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithStringValues, 'value');

      expect(sortedArray).toStrictEqual([
        {value: '1'},
        {value: '2'},
        {value: '2'},
        {value: '3'},
        {value: '4'},
      ]);
    });

    test('Sort an array with nested values', () => {
      const unsortedArrayWithEqualValue = [
        {value: {value: 2}},
        {value: {value: 3}},
        {value: {value: 2}},
        {value: {value: 4}},
        {value: {value: 1}},
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValue, 'value.value', true);

      expect(sortedArray).toStrictEqual([
        {value: {value: 4}},
        {value: {value: 3}},
        {value: {value: 2}},
        {value: {value: 2}},
        {value: {value: 1}},
      ]);
    });

    test('Sort an array with double nested values', () => {
      const unsortedArrayWithEqualValue = [
        {value: {value: {value: 2}}},
        {value: {value: {value: 3}}},
        {value: {value: {value: 2}}},
        {value: {value: {value: 4}}},
        {value: {value: {value: 1}}},
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValue, 'value.value.value', true);

      expect(sortedArray).toStrictEqual([
        {value: {value: {value: 4}}},
        {value: {value: {value: 3}}},
        {value: {value: {value: 2}}},
        {value: {value: {value: 2}}},
        {value: {value: {value: 1}}},
      ]);
    });
  });

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
});
