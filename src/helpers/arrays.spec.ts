import { assert } from 'chai';

import { sortArrayByObjectProperty, sortArrayByObjectPropertyLength } from './arrays';

describe('Array sorting', () => {

  describe('sortArrayByObjectProperty()', () => {
    const unsortedArray = [
      {value: 2},
      {value: 3},
      {value: 0},
      {value: 4},
      {value: 1}
    ];

    it('should sort the array by the object property', () => {
      const sortedArray = sortArrayByObjectProperty(unsortedArray, 'value');

      assert.deepEqual(sortedArray, [
        {value: 0},
        {value: 1},
        {value: 2},
        {value: 3},
        {value: 4}
      ]);
    });

    it('should reverse sort the array by the object property', () => {
      const sortedArray = sortArrayByObjectProperty(unsortedArray, 'value', true);

      assert.deepEqual(sortedArray, [
        {value: 4},
        {value: 3},
        {value: 2},
        {value: 1},
        {value: 0}
      ]);
    });

    it('should sort the array if two properties are equal', () => {
      const unsortedArrayWithEqualValue = [
        {value: 2},
        {value: 3},
        {value: 2},
        {value: 4},
        {value: 1}
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValue, 'value');

      assert.deepEqual(sortedArray, [
        {value: 1},
        {value: 2},
        {value: 2},
        {value: 3},
        {value: 4}
      ]);
    });

    it('should reverse sort the array if two properties are equal', () => {
      const unsortedArrayWithEqualValue = [
        {value: 2},
        {value: 3},
        {value: 2},
        {value: 4},
        {value: 1}
      ];

      const sortedArray = sortArrayByObjectProperty(unsortedArrayWithEqualValue, 'value', true);

      assert.deepEqual(sortedArray, [
        {value: 4},
        {value: 3},
        {value: 2},
        {value: 2},
        {value: 1}
      ]);
    });
  });

  describe('sortArrayByObjectPropertyLength()', () => {
    const unsortedArray = [
      {value: '12345'},
      {value: '12'},
      {value: '1'},
      {value: '123'},
      {value: '1234'}
    ];

    it('should sort the array by the object property length', () => {
      const sortedArray = sortArrayByObjectPropertyLength(unsortedArray, 'value');

      assert.deepEqual(sortedArray, [
        {value: '1'},
        {value: '12'},
        {value: '123'},
        {value: '1234'},
        {value: '12345'}
      ]);
    });

    it('should reverse sort the array by the object property length', () => {
      const sortedArray = sortArrayByObjectPropertyLength(unsortedArray, 'value', true);

      assert.deepEqual(sortedArray, [
        {value: '12345'},
        {value: '1234'},
        {value: '123'},
        {value: '12'},
        {value: '1'}
      ]);
    });

    it('should sort the array by the object property length with equal length values', () => {
      const unsortedArrayWithEqualValues = [
        {value: '12345'},
        {value: '12'},
        {value: '1'},
        {value: '123'},
        {value: '1234'},
        {value: '12'}
      ];

      const sortedArray = sortArrayByObjectPropertyLength(unsortedArrayWithEqualValues, 'value');

      assert.deepEqual(sortedArray, [
        {value: '1'},
        {value: '12'},
        {value: '12'},
        {value: '123'},
        {value: '1234'},
        {value: '12345'}
      ]);
    });

    it('should reverse sort the array by the object property length with equal length values', () => {
      const unsortedArrayWithEqualValues = [
        {value: '12345'},
        {value: '12'},
        {value:  '1'},
        {value: '123'},
        {value: '1234'},
        {value: '12'}
      ];

      const sortedArray = sortArrayByObjectPropertyLength(unsortedArrayWithEqualValues, 'value', true);

      assert.deepEqual(sortedArray, [
        {value: '12345'},
        {value: '1234'},
        {value: '123'},
        {value: '12'},
        {value: '12'},
        {value: '1'}
      ]);
    });
  });
});
