import { assert } from 'chai';
import * as Fuse from 'fuse.js';
import { assert as sAssert, SinonSpy, SinonStub, spy, stub } from 'sinon';
import { logger, WinstonPnPLogger } from 'winston-pnp-logger';

import { typeIDsPath } from '../market-bot';
import { guessUserItemInput } from './guessers';
import { loadItems } from './items-loader';
import { readTypeIDs } from './readers';

describe('Guess user item input', function(this: any) {

  before(function(this: any) {
    this.timeout(60000);

    new WinstonPnPLogger({
      announceSelf: false
    });
    const loggerStub: SinonStub = stub(logger, 'info');
    loadItems(readTypeIDs(typeIDsPath));
    loggerStub.restore();
  });

  describe('guessUserItemInput() - Simple', function(this: any) {

    let fuseSearchFunction: SinonSpy;

    beforeEach(function(this: any) {
      fuseSearchFunction = spy(Fuse.prototype, 'search');
    });

    afterEach(function(this: any) {
      fuseSearchFunction.restore();
    });

    const itemName = 'Mackinaw';

    it('It should correctly return a correctly spelled item', () => {
      const result = guessUserItemInput(itemName);
      assert.isObject(result);
      assert.equal(result.itemData.name.en, itemName);
      assert.isFalse(result.guess);
      sAssert.notCalled(fuseSearchFunction);
    });

    it('It should correctly return an item with just the start typed', () => {
      const result = guessUserItemInput(itemName.substring(0, 4));
      assert.isObject(result);
      assert.equal(result.itemData.name.en, itemName);
      assert.isFalse(result.guess);
      sAssert.notCalled(fuseSearchFunction);
    });

    it('It should correctly return an item with just the end typed', () => {
      const result = guessUserItemInput(itemName.substring(4, itemName.length));
      assert.isObject(result);
      assert.equal(result.itemData.name.en, itemName);
      assert.isFalse(result.guess);
      sAssert.notCalled(fuseSearchFunction);
    });

    it('It should correctly return an item with just the middle typed', () => {
      const result = guessUserItemInput(itemName.substring(1, itemName.length - 1));
      assert.isObject(result);
      assert.equal(result.itemData.name.en, itemName);
      assert.isFalse(result.guess);
      sAssert.notCalled(fuseSearchFunction);
    });
  });

  describe('guessUserItemInput() - Complex', function(this: any) {

    let fuseSearchFunction: SinonSpy;

    beforeEach(function(this: any) {
      fuseSearchFunction = spy(Fuse.prototype, 'search');
    });

    afterEach(function(this: any) {
      fuseSearchFunction.restore();
    });

    const itemName = 'Mackinaw';

    it('It should correctly return a misspelled item', () => {
      const result = guessUserItemInput('Backinbaw');
      assert.isObject(result);
      assert.equal(result.itemData.name.en, itemName);
      assert.isTrue(result.guess);
      sAssert.calledOnce(fuseSearchFunction);
    });

    it('It should return nothing when given a horribly misspelled item', () => {
      const result = guessUserItemInput('/////////');
      assert.isObject(result);
      assert.isUndefined(result.itemData);
      assert.isTrue(result.guess);
      sAssert.calledOnce(fuseSearchFunction);
    });
  });

  describe('guessUserItemInput() - Shortcuts', function(this: any) {

    let fuseSearchFunction: SinonSpy;

    beforeEach(function(this: any) {
      fuseSearchFunction = spy(Fuse.prototype, 'search');
    });

    afterEach(function(this: any) {
      fuseSearchFunction.restore();
    });

    const itemName = 'Mining Laser Upgrade I';
    const itemNameT2 = 'Mining Laser Upgrade II';
    const shortcut = 'mlu';
    const shortcutT2 = 'mlu II';

    it('It should resolve a shortcut to an item', () => {
      const result = guessUserItemInput(shortcut);
      assert.isObject(result);
      assert.equal(result.itemData.name.en, itemName);
      assert.isFalse(result.guess);
      sAssert.notCalled(fuseSearchFunction);
    });

    it('It should be able to resolve t2 versions of shortcuts', () => {
      const result = guessUserItemInput(shortcutT2);
      assert.isObject(result);
      assert.equal(result.itemData.name.en, itemNameT2);
      assert.isFalse(result.guess);
      sAssert.notCalled(fuseSearchFunction);
    });
  });
});
