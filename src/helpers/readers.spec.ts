// import { assert } from 'chai';
// import { SinonStub, stub } from 'sinon';
// import { logger, WinstonPnPLogger } from 'winston-pnp-logger';
// import { readTypeIDs } from './readers';
//
// describe('Read files', function(this: any) {
//
//   let loggerStub: SinonStub;
//
//   before(function(this: any) {
//
//     if (!logger) {
//       new WinstonPnPLogger({
//         announceSelf: false
//       });
//     }
//     loggerStub = stub(logger, 'info');
//   });
//
//   after(function(this: any) {
//     loggerStub.restore();
//   });
//
//   describe('readTypeIDs()', function(this: any) {
//     const testFile = 'data/typeIDs_test.yaml';
//
//     it('Should read TypeIDs from a file', () => {
//       const expectedContents: any = {
//         1: {name: {}},
//         22542: {name: {en: 'Mining Laser Upgrade I'}},
//         22548: {name: {en: 'Mackinaw'}},
//         28576: {name: {en: 'Mining Laser Upgrade II'}}
//       };
//
//       const fileContents: any = readTypeIDs(testFile);
//       assert.isObject(expectedContents);
//       assert.deepEqual(fileContents, expectedContents);
//     });
//   });
// });
