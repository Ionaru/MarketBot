import { assert } from 'chai';

import { formatNumber, pluralize } from './formatters';

describe('Formatting functions', () => {

  describe('pluralize()', () => {
    const singular = 'thing';
    const plural = 'things';
    let amount: number;

    it('should return the plural if item amount is 0', () => {
      amount = 0;
      const result = pluralize(singular, plural, amount);
      assert.isString(result);
      assert.equal(result, plural);
    });

    it('should return the singular if item amount is 1', () => {
      amount = 1;
      const result = pluralize(singular, plural, amount);
      assert.isString(result);
      assert.equal(result, singular);
    });

    it('should return the plural if item amount is 2 or greater (test 2 - 100)', () => {
      for (let i = 2; i <= 100; i++) {
        amount = i;
        const result = pluralize(singular, plural, amount);
        assert.isString(result);
        assert.equal(result, plural);
      }
    });

    it('should return the plural if item amount is negative', () => {
      amount = -1;
      const result = pluralize(singular, plural, amount);
      assert.isString(result);
      assert.equal(result, plural);
    });
  });

  describe('formatNumber()', () => {

    it('should output xx,xxx.xx by default', () => {
      const result = formatNumber(50000);
      assert.isString(result);
      assert.equal(result, '50,000.00');
    });

    it('should support negative numbers', () => {
      const result = formatNumber(-50000);
      assert.isString(result);
      assert.equal(result, '-50,000.00');
    });

    it('should properly format a number with different digits in it', () => {
      const result = formatNumber(1234567890);
      assert.isString(result);
      assert.equal(result, '1,234,567,890.00');
    });

    it('should properly format larger numbers', () => {
      const result = formatNumber(5000000000);
      assert.isString(result);
      assert.equal(result, '5,000,000,000.00');
    });

    it('should properly format smaller numbers', () => {
      const result = formatNumber(500);
      assert.isString(result);
      assert.equal(result, '500.00');
    });

    it('should accept a string as input', () => {
      const result = formatNumber('50000');
      assert.isString(result);
      assert.equal(result, '50,000.00');
    });

    it('should return 0.00 when input is not a number', () => {
      const result = formatNumber('not_a_number');
      assert.isString(result);
      assert.equal(result, '0.00');
    });

    it('should accept different amount of decimals', () => {
      const result = formatNumber(50000, 6);
      assert.isString(result);
      assert.equal(result, '50,000.000000');
    });

    it('should accept zero decimals', () => {
      const result = formatNumber(50000, 0);
      assert.isString(result);
      assert.equal(result, '50,000');
    });

    it('should correctly round amounts up', () => {
      const result = formatNumber(49999.50, 0);
      assert.isString(result);
      assert.equal(result, '50,000');
    });

    it('should correctly round amounts down', () => {
      const result = formatNumber(49999.49, 0);
      assert.isString(result);
      assert.equal(result, '49,999');
    });

    it('should not change the number when rounding', () => {
      const result = formatNumber(49999.00, 0);
      assert.isString(result);
      assert.equal(result, '49,999');
    });

    it('should accept different delimiters', () => {
      const result = formatNumber(50000, 2, undefined, 'X');
      assert.isString(result);
      assert.equal(result, '50X000.00');
    });

    it('should accept different decimal marks', () => {
      const result = formatNumber(50000, 2, 'X');
      assert.isString(result);
      assert.equal(result, '50,000X00');
    });

    it('should be able to have an empty string as delimiter', () => {
      const result = formatNumber(50000, 2, undefined, '');
      assert.isString(result);
      assert.equal(result, '50000.00');
    });

    it('should be able to have an empty string as both decimal mark and delimiter', () => {
      const result = formatNumber(50000, 2, '', '');
      assert.isString(result);
      assert.equal(result, '5000000');
    });

    it('should be able to handle the same character as decimal mark and delimiter', () => {
      const result = formatNumber(50000, 2, 'X', 'X');
      assert.isString(result);
      assert.equal(result, '50X000X00');
    });

    it('should use default values when parameters are undefined', () => {
      const result = formatNumber(50000, undefined, undefined, undefined);
      assert.isString(result);
      assert.equal(result, '50,000.00');
    });
  });
});
