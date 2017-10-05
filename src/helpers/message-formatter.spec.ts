import { assert } from 'chai';

import { itemFormat, makeBold, makeCode, makeItalics, makeURL, makeUserLink, newLine, regionFormat } from './message-formatter';

describe('Message-formatter functions', () => {

  describe('makeBold()', () => {

    it('should add the correct tags for a string', () => {
      const messageText = 'test message please ignore';
      const message = makeBold(messageText);
      assert.equal(message, `**${messageText}**`);
    });

    it('should add the correct tags for a number', () => {
      const messageNumber = 404;
      const message = makeBold(messageNumber);
      assert.equal(message, `**${messageNumber}**`);
    });
  });

  describe('makeItalics()', () => {

    it('should add the correct tags for a string', () => {
      const messageText = 'test message please ignore';
      const message = makeItalics(messageText);
      assert.equal(message, `*${messageText}*`);
    });

    it('should add the correct tags for a number', () => {
      const messageNumber = 404;
      const message = makeItalics(messageNumber);
      assert.equal(message, `*${messageNumber}*`);
    });
  });

  describe('makeCode()', () => {

    it('should add the correct tags for a string', () => {
      const messageText = 'test message please ignore';
      const message = makeCode(messageText);
      assert.equal(message, `\`${messageText}\``);
    });

    it('should add the correct tags for a number', () => {
      const messageNumber = 404;
      const message = makeCode(messageNumber);
      assert.equal(message, `\`${messageNumber}\``);
    });
  });

  describe('makeURL()', () => {

    it('should add the correct tags for a string', () => {
      const messageText = 'test message please ignore';
      const message = makeURL(messageText);
      assert.equal(message, `<${messageText}>`);
    });

    it('should add the correct tags for a number', () => {
      const messageNumber = 404;
      const message = makeURL(messageNumber);
      assert.equal(message, `<${messageNumber}>`);
    });
  });

  describe('makeUserLink()', () => {

    it('should add the correct tags for a string', () => {
      const messageText = 'test message please ignore';
      const message = makeUserLink(messageText);
      assert.equal(message, `<@${messageText}>`);
    });
  });

  describe('newLine()', () => {

    it('should add a single newline on function call', () => {
      assert.equal(newLine(), '\n');
    });

    it('should add a few newlines when a parameter is supplied', () => {
      assert.equal(newLine(5), '\n\n\n\n\n');
    });

    it('should return empty string when parameter is 0', () => {
      assert.equal(newLine(0), '');
    });
  });

  describe('itemFormat()', () => {

    it('should add the correct tags for a string', () => {
      const messageText = 'test message please ignore';
      const message = itemFormat(messageText);
      assert.equal(message, `\`${messageText}\``);
    });

    it('should add the correct tags for a number', () => {
      const messageNumber = 404;
      const message = itemFormat(messageNumber);
      assert.equal(message, `\`${messageNumber}\``);
    });
  });

  describe('regionFormat()', () => {

    it('should add the correct tags for a string', () => {
      const messageText = 'test message please ignore';
      const message = regionFormat(messageText);
      assert.equal(message, `**${messageText}**`);
    });

    it('should add the correct tags for a number', () => {
      const messageNumber = 404;
      const message = regionFormat(messageNumber);
      assert.equal(message, `**${messageNumber}**`);
    });
  });
});
