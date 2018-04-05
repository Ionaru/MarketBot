import * as fs from 'fs';
import * as git from 'git-rev-sync';
import { logger } from 'winston-pnp-logger';

import { makeCode } from './message-formatter';

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

export function readFileContents(filePath: string, deleteIfError = false): string | undefined {
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath).toString();
    } catch {
      logger.warn(`The file ${filePath} could not be read.`);
      if (deleteIfError) {
        logger.warn(`Deleting the file ${filePath}.`);
        try {
          fs.unlinkSync(filePath);
          logger.warn(`File ${filePath} deleted.`);
        } catch (e) {
          logger.warn(`The file ${filePath} could not be deleted, please delete manually. Reason: ${e}`);
        }
      }
    }
  }
  return;
}
