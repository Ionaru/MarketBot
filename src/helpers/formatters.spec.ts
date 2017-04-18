import { formatISK, pluralize } from './formatters';
import { expect } from 'chai';

describe('Formatters', () => {

  describe('pluralize', () => {
    const singular = 'thing';
    const plural = 'things';
    let amount: number;

    it('should return the plural if item amount is 0', () => {
      amount = 0;
      const result = pluralize(singular, plural, amount);
      expect(result).to.be.a('string');
      expect(result).to.equal(plural);
    });

    it('should return the singular if item amount is 1', () => {
      amount = 1;
      const result = pluralize(singular, plural, amount);
      expect(result).to.be.a('string');
      expect(result).to.equal(singular);
    });

    it('should return the plural if item amount is 2 or greater (test 2 - 100)', () => {
      for (let i = 2; i <= 100; i++) {
        amount = i;
        const result = pluralize(singular, plural, amount);
        expect(result).to.be.a('string');
        expect(result).to.equal(plural);
      }
    });

    it('should return the plural if item amount is negative', () => {
      amount = -1;
      const result = pluralize(singular, plural, amount);
      expect(result).to.be.a('string');
      expect(result).to.equal(plural);
    });
  });

  describe('formatISK', () => {
    let amount: number | string;

    it('should output xx,xxx.xx by default', () => {
      amount = 50000;
      const result = formatISK(50000);
      expect(result).to.be.a('string');
      expect(result).to.equal('50,000.00');
    });

    it('should accept different amount of decimals', () => {
      amount = 50000;
      const result = formatISK(50000, 6);
      expect(result).to.be.a('string');
      expect(result).to.equal('50,000.000000');
    });

    it('should accept zero decimals', () => {
      amount = 50000;
      const result = formatISK(50000, 0);
      expect(result).to.be.a('string');
      expect(result).to.equal('50,000');
    });

    it('should correctly round amounts up', () => {
      amount = 50000;
      const result = formatISK(49999.50, 0);
      expect(result).to.be.a('string');
      expect(result).to.equal('50,000');
    });

    it('should correctly round amounts down', () => {
      amount = 50000;
      const result = formatISK(49999.49, 0);
      expect(result).to.be.a('string');
      expect(result).to.equal('49,999');
    });

    it('should accept different delimiters', () => {
      amount = 50000;
      const result = formatISK(50000, 2, '.', 'X');
      expect(result).to.be.a('string');
      expect(result).to.equal('50X000.00');
    });

    it('should accept different decimal marks', () => {
      amount = 50000;
      const result = formatISK(50000, 2, 'X', '.');
      expect(result).to.be.a('string');
      expect(result).to.equal('50.000X00');
    });
  });
});
