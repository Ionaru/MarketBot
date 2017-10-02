import * as fs from 'fs';
import * as jsyaml from 'js-yaml';
import * as path from 'path';
import { logger } from 'winston-pnp-logger';

import { ITypeIDs } from '../typings';

export function readTypeIDs(filePath: string): ITypeIDs {
  logger.info(`Reading typeIDs from '${path.join(process.cwd(), filePath)}'`);
  return jsyaml.load(fs.readFileSync(filePath).toString());
}

export function readToken(filePath: string): string {
  logger.info(`Reading token from '${path.join(process.cwd(), filePath)}'`);
  return fs.readFileSync(filePath).toString().trim();
}
