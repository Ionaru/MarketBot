/* tslint:disable:no-big-function no-identical-functions */

import { formatNumber, pluralize } from './formatters';

describe('Formatting functions', () => {

  describe('pluralize()', () => {
    const singular = 'thing';
    const plural = 'things';
    let amount: number;

    test('should return the plural if item amount is 0', () => {
      amount = 0;
      const result = pluralize(singular, plural, amount);
      expect(typeof result).toBe('string');
      expect(result).toEqual(plural);
    });

    test('should return the singular if item amount is 1', () => {
      amount = 1;
      const result = pluralize(singular, plural, amount);
      expect(typeof result).toBe('string');
      expect(result).toEqual(singular);
    });

    test('should return the plural if item amount is 2 or greater (test 2 - 100)', () => {
      for (let i = 2; i <= 100; i++) {
        amount = i;
        const result = pluralize(singular, plural, amount);
        expect(typeof result).toBe('string');
        expect(result).toEqual(plural);
      }
    });

    test('should return the plural if item amount is negative', () => {
      amount = -1;
      const result = pluralize(singular, plural, amount);
      expect(typeof result).toBe('string');
      expect(result).toEqual(plural);
    });
  });

  describe('formatNumber()', () => {

    test.each([

      [-Infinity, '0.00'],
      [-50000, '-50,000.00'],
      [-0, '0.00'],
      [0, '0.00'],
      [1, '1.00'],
      [500, '500.00'],
      [50000, '50,000.00'],
      [1234567890, '1,234,567,890.00'],
      [5000000000, '5,000,000,000.00'],
      [Infinity, '0.00'],

    ])('default formatting behaviour: %d', (input, expected) => {

      const result = formatNumber(input);
      expect(typeof result).toBe('string');
      expect(result).toEqual(expected);

    });

    test('should accept a string as input', () => {
      const result = formatNumber('50000');
      expect(typeof result).toBe('string');
      expect(result).toEqual('50,000.00');
    });

    test('should return 0.00 when input is not a number', () => {
      const result = formatNumber('not_a_number');
      expect(typeof result).toBe('string');
      expect(result).toEqual('0.00');
    });

    test.each([

      [0, 0, '0'],
      [0.5, 0, '1'],
      [1, 0, '1'],
      [49999.00, 0, '49,999'],
      [49999.49, 0, '49,999'],
      [49999.5, 0, '50,000'],
      [50000, 0, '50,000'],

      [0, 1, '0.0'],
      [1, 1, '1.0'],
      [1.45, 1, '1.4'],
      [1.494, 1, '1.5'],
      [1.495, 1, '1.5'],

      [0, 2, '0.00'],
      [0.5, 2, '0.50'],
      [1, 2, '1.00'],
      [49999.00, 2, '49,999.00'],
      [49999.49, 2, '49,999.49'],
      [49999.5, 2, '49,999.50'],
      [50000, 2, '50,000.00'],
      [50000.494, 2, '50,000.49'],
      [50000.495, 2, '50,000.50'],

      [50000, 6, '50,000.000000'],

      // Dynamic decimal amount
      [49999.995, Infinity, '49,999.995'],
      [50000, Infinity, '50,000'],
      [50000.5, Infinity, '50,000.5'],
      [50000.50, Infinity, '50,000.5'],
      [50000.51234567891, Infinity, '50,000.51234567891'],

    ])('rounding %d to %p decimal place(s)', (input, decimalAmount, expected) => {

      const result = formatNumber(input, decimalAmount as number);
      expect(typeof result).toBe('string');
      expect(result).toEqual(expected);

    });

    test('should accept different delimiters', () => {
      const result = formatNumber(50000, 2, undefined, 'X');
      expect(typeof result).toBe('string');
      expect(result).toEqual('50X000.00');
    });

    test('should accept different decimal marks', () => {
      const result = formatNumber(50000, 2, 'X');
      expect(typeof result).toBe('string');
      expect(result).toEqual('50,000X00');
    });

    test('should be able to have an empty string as delimiter', () => {
      const result = formatNumber(50000, 2, undefined, '');
      expect(typeof result).toBe('string');
      expect(result).toEqual('50000.00');
    });

    test('should be able to have an empty string as both decimal mark and delimiter', () => {
      const result = formatNumber(50000, 2, '', '');
      expect(typeof result).toBe('string');
      expect(result).toEqual('5000000');
    });

    test('should be able to handle the same character as decimal mark and delimiter', () => {
      const result = formatNumber(50000, 2, 'X', 'X');
      expect(typeof result).toBe('string');
      expect(result).toEqual('50X000X00');
    });

    test('should use default values when parameters are undefined', () => {
      const result = formatNumber(50000, undefined, undefined, undefined);
      expect(typeof result).toBe('string');
      expect(result).toEqual('50,000.00');
    });
  });
});
