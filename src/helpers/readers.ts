import * as fs from 'fs';
import * as git from 'git-rev-sync';
import * as jsyaml from 'js-yaml';
import * as path from 'path';
import { logger } from 'winston-pnp-logger';

import { ITypeIDs } from '../typings';
import { makeCode } from './message-formatter';

export function readTypeIDs(filePath: string): ITypeIDs {
  logger.info(`Reading typeIDs from '${path.join(process.cwd(), filePath)}'`);
  return jsyaml.load(fs.readFileSync(filePath).toString());
}

export function readVersion(): string {
  let version = makeCode('unknown');
  try {
    version = makeCode(git.tag());
    if (git.isTagDirty()) {
      version = `${makeCode(git.short())}, based on release ${makeCode(git.tag())}`;
    }
  } catch (error) {
    logger.error('Unable to get version information from Git', error);
  }
  return version;
}
