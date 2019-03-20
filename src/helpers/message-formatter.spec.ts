/* tslint:disable:no-big-function no-identical-functions no-duplicate-string */

import { itemFormat, makeBold, makeCode, makeItalics, makeURL, makeUserLink, newLine, regionFormat } from './message-formatter';

describe('Message-formatter functions', () => {

    describe('makeBold()', () => {

        test('should add the correct tags for a string', () => {
            const messageText = 'test message please ignore';
            const message = makeBold(messageText);
            expect(message).toEqual(`**${messageText}**`);
        });

        test('should add the correct tags for a number', () => {
            const messageNumber = 404;
            const message = makeBold(messageNumber);
            expect(message).toEqual(`**${messageNumber}**`);
        });
    });

    describe('makeItalics()', () => {

        test('should add the correct tags for a string', () => {
            const messageText = 'test message please ignore';
            const message = makeItalics(messageText);
            expect(message).toEqual(`*${messageText}*`);
        });

        test('should add the correct tags for a number', () => {
            const messageNumber = 404;
            const message = makeItalics(messageNumber);
            expect(message).toEqual(`*${messageNumber}*`);
        });
    });

    describe('makeCode()', () => {

        test('should add the correct tags for a string', () => {
            const messageText = 'test message please ignore';
            const message = makeCode(messageText);
            expect(message).toEqual(`\`${messageText}\``);
        });

        test('should add the correct tags for a number', () => {
            const messageNumber = 404;
            const message = makeCode(messageNumber);
            expect(message).toEqual(`\`${messageNumber}\``);
        });
    });

    describe('makeURL()', () => {

        test('should add the correct tags for a string', () => {
            const messageText = 'test message please ignore';
            const message = makeURL(messageText);
            expect(message).toEqual(`<${messageText}>`);
        });

        test('should add the correct tags for a number', () => {
            const messageNumber = 404;
            const message = makeURL(messageNumber);
            expect(message).toEqual(`<${messageNumber}>`);
        });
    });

    describe('makeUserLink()', () => {

        test('should add the correct tags for a string', () => {
            const messageText = 'test message please ignore';
            const message = makeUserLink(messageText);
            expect(message).toEqual(`<@${messageText}>`);
        });
    });

    describe('newLine()', () => {

        test('should add a single newline on function call', () => {
            expect(newLine()).toEqual('\n');
        });

        test('should add a few newlines when a parameter is supplied', () => {
            expect(newLine(5)).toEqual('\n\n\n\n\n');
        });

        test('should return empty string when parameter is 0', () => {
            expect(newLine(0)).toEqual('');
        });
    });

    describe('itemFormat()', () => {

        test('should add the correct tags for a string', () => {
            const messageText = 'test message please ignore';
            const message = itemFormat(messageText);
            expect(message).toEqual(`\`${messageText}\``);
        });

        test('should add the correct tags for a number', () => {
            const messageNumber = 404;
            const message = itemFormat(messageNumber);
            expect(message).toEqual(`\`${messageNumber}\``);
        });
    });

    describe('regionFormat()', () => {

        test('should add the correct tags for a string', () => {
            const messageText = 'test message please ignore';
            const message = regionFormat(messageText);
            expect(message).toEqual(`**${messageText}**`);
        });

        test('should add the correct tags for a number', () => {
            const messageNumber = 404;
            const message = regionFormat(messageNumber);
            expect(message).toEqual(`**${messageNumber}**`);
        });
    });
});
