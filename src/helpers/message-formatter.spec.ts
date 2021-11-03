import {
    itemFormat,
    makeBold,
    makeCode,
    makeItalics,
    makeURL,
    makeUserLink,
    newLine,
    regionFormat,
} from './message-formatter';

describe('message-formatter functions', () => {

    describe('makeBold()', () => {

        it('should add the correct tags for a string', () => {
            expect.assertions(1);
            const messageText = 'test message please ignore';
            const message = makeBold(messageText);
            expect(message).toBe(`**${ messageText }**`);
        });

        it('should add the correct tags for a number', () => {
            expect.assertions(1);
            const messageNumber = 404;
            const message = makeBold(messageNumber);
            expect(message).toBe(`**${ messageNumber }**`);
        });
    });

    describe('makeItalics()', () => {

        it('should add the correct tags for a string', () => {
            expect.assertions(1);
            const messageText = 'test message please ignore';
            const message = makeItalics(messageText);
            expect(message).toBe(`*${ messageText }*`);
        });

        it('should add the correct tags for a number', () => {
            expect.assertions(1);
            const messageNumber = 404;
            const message = makeItalics(messageNumber);
            expect(message).toBe(`*${ messageNumber }*`);
        });
    });

    describe('makeCode()', () => {

        it('should add the correct tags for a string', () => {
            expect.assertions(1);
            const messageText = 'test message please ignore';
            const message = makeCode(messageText);
            expect(message).toBe(`\`${ messageText }\``);
        });

        it('should add the correct tags for a number', () => {
            expect.assertions(1);
            const messageNumber = 404;
            const message = makeCode(messageNumber);
            expect(message).toBe(`\`${ messageNumber }\``);
        });
    });

    describe('makeURL()', () => {

        it('should add the correct tags for a string', () => {
            expect.assertions(1);
            const messageText = 'test message please ignore';
            const message = makeURL(messageText);
            expect(message).toBe(`<${ messageText }>`);
        });

        it('should add the correct tags for a number', () => {
            expect.assertions(1);
            const messageNumber = 404;
            const message = makeURL(messageNumber);
            expect(message).toBe(`<${ messageNumber }>`);
        });
    });

    describe('makeUserLink()', () => {

        it('should add the correct tags for a string', () => {
            expect.assertions(1);
            const messageText = 'test message please ignore';
            const message = makeUserLink(messageText);
            expect(message).toBe(`<@${ messageText }>`);
        });
    });

    describe('newLine()', () => {

        it('should add a single newline on function call', () => {
            expect.assertions(1);
            expect(newLine()).toBe('\n');
        });

        it('should add a few newlines when a parameter is supplied', () => {
            expect.assertions(1);
            expect(newLine(5)).toBe('\n\n\n\n\n');
        });

        it('should return empty string when parameter is 0', () => {
            expect.assertions(1);
            expect(newLine(0)).toBe('');
        });
    });

    describe('itemFormat()', () => {

        it('should add the correct tags for a string', () => {
            expect.assertions(1);
            const messageText = 'test message please ignore';
            const message = itemFormat(messageText);
            expect(message).toBe(`\`${ messageText }\``);
        });

        it('should add the correct tags for a number', () => {
            expect.assertions(1);
            const messageNumber = 404;
            const message = itemFormat(messageNumber);
            expect(message).toBe(`\`${ messageNumber }\``);
        });
    });

    describe('regionFormat()', () => {

        it('should add the correct tags for a string', () => {
            expect.assertions(1);
            const messageText = 'test message please ignore';
            const message = regionFormat(messageText);
            expect(message).toBe(`**${ messageText }**`);
        });

        it('should add the correct tags for a number', () => {
            expect.assertions(1);
            const messageNumber = 404;
            const message = regionFormat(messageNumber);
            expect(message).toBe(`**${ messageNumber }**`);
        });
    });
});
