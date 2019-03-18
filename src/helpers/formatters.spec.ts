/* tslint:disable:no-big-function no-identical-functions */

import { pluralize } from './formatters';

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
