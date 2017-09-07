import * as Fuse from 'fuse.js';
import { logger } from 'winston-pnp-logger';

import { typeIDsPath } from '../market-bot';
import { ISDEObject } from '../typings';
import { parseTypeIDs } from './parsers';
import { readTypeIDs } from './readers';

export let fuse: Fuse;
export let fuseOptions = {
  distance: 100,
  keys: ['name.en'],
  location: 0,
  maxPatternLength: 128,
  minMatchCharLength: 1,
  shouldSort: true,
  threshold: 0.6,
  tokenize: true
};

export let items: ISDEObject[];

export function loadItems(): void {
  const typeIDs = readTypeIDs(typeIDsPath);
  logger.info('File loaded, starting parse cycle');
  items = parseTypeIDs(typeIDs);
  logger.info(`Parsing complete, ${items.length} items loaded into memory`);
  fuse = new Fuse(items, fuseOptions);
}
