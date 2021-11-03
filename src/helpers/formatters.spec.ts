import { pluralize } from './formatters';

describe('pluralize()', () => {
    const singular = 'thing';
    const plural = 'things';
    let amount: number;

    it('should return the plural if item amount is 0', () => {
        expect.assertions(2);
        amount = 0;
        const result = pluralize(singular, plural, amount);
        expect(typeof result).toBe('string');
        expect(result).toBe(plural);
    });

    it('should return the singular if item amount is 1', () => {
        expect.assertions(2);
        amount = 1;
        const result = pluralize(singular, plural, amount);
        expect(typeof result).toBe('string');
        expect(result).toBe(singular);
    });

    it('should return the plural if item amount is 2 or greater (test 2 - 100)', () => {
        expect.assertions(198);
        for (let i = 2; i <= 100; i++) {
            amount = i;
            const result = pluralize(singular, plural, amount);
            expect(typeof result).toBe('string');
            expect(result).toBe(plural);
        }
    });

    it('should return the plural if item amount is negative', () => {
        expect.assertions(2);
        amount = -1;
        const result = pluralize(singular, plural, amount);
        expect(typeof result).toBe('string');
        expect(result).toBe(plural);
    });
});
