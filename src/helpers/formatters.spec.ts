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

    test('should output xx,xxx.xx by default', () => {
      const result = formatNumber(50000);
      expect(typeof result).toBe('string');
      expect(result).toEqual('50,000.00');
    });

    test('should support negative numbers', () => {
      const result = formatNumber(-50000);
      expect(typeof result).toBe('string');
      expect(result).toEqual('-50,000.00');
    });

    test('should properly format a number with different digits in it', () => {
      const result = formatNumber(1234567890);
      expect(typeof result).toBe('string');
      expect(result).toEqual('1,234,567,890.00');
    });

    test('should properly format larger numbers', () => {
      const result = formatNumber(5000000000);
      expect(typeof result).toBe('string');
      expect(result).toEqual('5,000,000,000.00');
    });

    test('should properly format smaller numbers', () => {
      const result = formatNumber(500);
      expect(typeof result).toBe('string');
      expect(result).toEqual('500.00');
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

    test('should accept different amount of decimals', () => {
      const result = formatNumber(50000, 6);
      expect(typeof result).toBe('string');
      expect(result).toEqual('50,000.000000');
    });

    test('should accept zero decimals', () => {
      const result = formatNumber(50000, 0);
      expect(typeof result).toBe('string');
      expect(result).toEqual('50,000');
    });

    test('should correctly round amounts up', () => {
      const result = formatNumber(49999.50, 0);
      expect(typeof result).toBe('string');
      expect(result).toEqual('50,000');
    });

    test('should correctly round amounts down', () => {
      const result = formatNumber(49999.49, 0);
      expect(typeof result).toBe('string');
      expect(result).toEqual('49,999');
    });

    test('should not change the number when rounding', () => {
      const result = formatNumber(49999.00, 0);
      expect(typeof result).toBe('string');
      expect(result).toEqual('49,999');
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
