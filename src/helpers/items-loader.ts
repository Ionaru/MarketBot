import * as Fuse from 'fuse.js';
import { logger } from 'winston-pnp-logger';

import { ISDEObject, ITypeIDs } from '../typings';
import { parseTypeIDs } from './parsers';

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

export function loadItems(typeIDs: ITypeIDs): void {
  logger.info('typeIDs loaded, starting parse cycle');
  items = parseTypeIDs(typeIDs);
  logger.info(`Parsing complete, ${items.length} items loaded into memory`);
  fuse = new Fuse(items, fuseOptions);
}
