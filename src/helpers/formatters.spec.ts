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
    let amount: number | string;

    it('should output xx,xxx.xx by default', () => {
      amount = 50000;
      const result = formatNumber(50000);
      assert.isString(result);
      assert.equal(result, '50,000.00');
    });

    it('should accept a string as input', () => {
      amount = 50000;
      const result = formatNumber('50000');
      assert.isString(result);
      assert.equal(result, '50,000.00');
    });

    it('should accept different amount of decimals', () => {
      amount = 50000;
      const result = formatNumber(50000, 6);
      assert.isString(result);
      assert.equal(result, '50,000.000000');
    });

    it('should accept zero decimals', () => {
      amount = 50000;
      const result = formatNumber(50000, 0);
      assert.isString(result);
      assert.equal(result, '50,000');
    });

    it('should correctly round amounts up', () => {
      amount = 50000;
      const result = formatNumber(49999.50, 0);
      assert.isString(result);
      assert.equal(result, '50,000');
    });

    it('should correctly round amounts down', () => {
      amount = 50000;
      const result = formatNumber(49999.49, 0);
      assert.isString(result);
      assert.equal(result, '49,999');
    });

    it('should not change the number when rounding', () => {
      amount = 50000;
      const result = formatNumber(49999.00, 0);
      assert.isString(result);
      assert.equal(result, '49,999');
    });

    it('should accept different delimiters', () => {
      amount = 50000;
      const result = formatNumber(50000, 2, ',', 'X');
      assert.isString(result);
      assert.equal(result, '50X000,00');
    });

    it('should accept different decimal marks', () => {
      amount = 50000;
      const result = formatNumber(50000, 2, 'X');
      assert.isString(result);
      assert.equal(result, '50,000X00');
    });

    it('should be able to have an empty string as delimiter', () => {
      amount = 50000;
      const result = formatNumber(50000, 2, ',', '');
      assert.isString(result);
      assert.equal(result, '50000,00');
    });

    it('should be able to have an empty string as both decimal mark and delimiter', () => {
      amount = 50000;
      const result = formatNumber(50000, 2, '', '');
      assert.isString(result);
      assert.equal(result, '5000000');
    });

    it('should be able to handle the same character as decimal mark and delimiter', () => {
      amount = 50000;
      const result = formatNumber(50000, 2, 'X', 'X');
      assert.isString(result);
      assert.equal(result, '50X000X00');
    });
  });
});
