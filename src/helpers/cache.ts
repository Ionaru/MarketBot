import * as fs from 'fs';
import { logger } from 'winston-pnp-logger';

import { dataFolder } from '../market-bot';
import { INamesData } from '../typings';
import { fetchServerStatus, fetchUniverseNames } from './api';
import { readFileContents } from './readers';

const serverVersionFileName = 'server_version.txt';

export async function validateCache(): Promise<boolean> {
  const serverVersionFilePath = `${dataFolder}/${serverVersionFileName}`;

  const serverVersion = readFileContents(serverVersionFilePath, true);

  const serverStatus = await fetchServerStatus();

  if (!serverStatus) {
    throw new Error('Could not get EVE Online server status!');
  }

  if (serverStatus.server_version === serverVersion) {
    logger.info(`EVE Online server version matches saved version, using cache`);
    return true;
  }

  logger.info(`EVE Online server version does not match saved version, cache invalidated`);
  fs.writeFileSync(serverVersionFilePath, serverStatus.server_version);
  return false;
}

export async function cacheUniverse(cacheValid: boolean, type: string, fetchFunction: () => Promise<number[] | undefined>) {
  const savePath = `${dataFolder}/${type}.json`;

  if (fs.existsSync(savePath) && !cacheValid) {
    fs.unlinkSync(savePath);
  }

  const cachedRegions = readFileContents(savePath, true);
  if (cachedRegions) {
    try {
      return JSON.parse(cachedRegions);
    } catch {
      throw new Error(`Could not parse cached ${type} data!`);
    }
  }

  logger.info(`Updating ${type} cache`);

  const data = await fetchFunction();
  if (data) {
    const names = await fetchUniverseNames(data);
    if (names.length === data.length) {
      const cache: INamesData[] = [];
      for (const name of names) {
        cache.push(name);
      }
      fs.writeFileSync(savePath, JSON.stringify(cache));
    } else {
      throw new Error(`Name data for ${type} was incomplete!`);
    }
  } else {
    throw new Error(`Could not get ${type} from EVE Online API!`);
  }
}
