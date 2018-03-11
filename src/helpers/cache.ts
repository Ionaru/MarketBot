import * as fs from 'fs';
import * as Fuse from 'fuse.js';
import * as moment from 'moment';
import { logger } from 'winston-pnp-logger';

import { dataFolder } from '../market-bot';
import { ICitadelData, INamesData } from '../typings';
import {
  fetchCitadelData, fetchServerStatus, fetchUniverseNames, fetchUniverseRegions, fetchUniverseSystems,
  fetchUniverseTypes
} from './api';
import { createFuse } from './items-loader';
import { readFileContents } from './readers';

export let items: INamesData[];
export let systems: INamesData[];
export let regions: INamesData[];

export let itemsFuse: Fuse;
export let regionsFuse: Fuse;

export let citadels: ICitadelData;

const serverVersionFileName = 'server_version.txt';

export async function checkAndUpdateCache() {
  const cacheValid = await validateCache();
  regions = await cacheUniverse(cacheValid, 'regions', fetchUniverseRegions);
  systems = await cacheUniverse(cacheValid, 'systems', fetchUniverseSystems);
  items = await cacheUniverse(cacheValid, 'items', fetchUniverseTypes);
  itemsFuse = createFuse(items);

  let noon = moment.utc().hours(12).minute(0).second(0).millisecond(0);
  if (moment.utc().isAfter(noon)) {
    noon = noon.add(1, 'day');
  }
  const timeUntilNextNoon = noon.valueOf() - Date.now();
  setTimeout(checkAndUpdateCache, timeUntilNextNoon);
}

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

export async function checkAndUpdateCitadelCache() {
  logger.info(`Fetching known citadels from stop.hammerti.me API`);

  citadels = await fetchCitadelData().catch((error) => {
    logger.error(error);
    return {};
  });

  // Schedule a refresh of the citadel list every 6 hours.
  setInterval(async () => {
    const newCitadels = await fetchCitadelData().catch(() => {
      return {};
    });
    if (Object.keys(newCitadels).length && newCitadels.toString() !== citadels.toString()) {
      citadels = newCitadels;
      logger.info('Citadel data updated');
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  logger.info(`${Object.keys(citadels).length} citadels loaded into memory`);
}
