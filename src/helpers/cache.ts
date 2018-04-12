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
import { formatNumber } from './formatters';

export let items: INamesData[];
export let systems: INamesData[];
export let regions: INamesData[];

export let itemsFuse: Fuse;
export let regionsFuse: Fuse;

export let citadels: ICitadelData;

const serverVersionFileName = 'server_version.txt';

export async function checkAndUpdateCache() {
  const useCache = await validateCache();

  regions = await cacheUniverse(useCache, 'regions', fetchUniverseRegions);
  systems = await cacheUniverse(useCache, 'systems', fetchUniverseSystems);
  items = await cacheUniverse(useCache, 'items', fetchUniverseTypes);

  if (!regions.length || !systems.length || !items.length) {
    throw new Error('Data incomplete, bot cannot function!');
  }

  itemsFuse = createFuse(items);

  let noon = moment.utc().hours(12).minute(0).second(0).millisecond(0);
  if (moment.utc().isAfter(noon)) {
    noon = noon.add(1, 'day');
  }
  const timeUntilNextNoon = noon.valueOf() - Date.now();
  logger.debug(`Next cache check in ${formatNumber(timeUntilNextNoon / 3600000, 2)} hours`);
  setTimeout(checkAndUpdateCache, timeUntilNextNoon);
}

async function validateCache(): Promise<boolean> {
  const serverVersionFilePath = `${dataFolder}/${serverVersionFileName}`;

  const serverVersion = readFileContents(serverVersionFilePath, true);

  const serverStatus = await fetchServerStatus();

  if (!serverStatus) {
    logger.error('Could not get EVE Online server status, using cache if possible');
    // Return true so the cache is used.
    return true;
  }

  if (serverStatus.server_version === serverVersion) {
    logger.info(`EVE Online server version matches saved version, using cache`);
    return true;
  }

  logger.info(`EVE Online server version does not match saved version, cache invalidated`);
  fs.writeFileSync(serverVersionFilePath, serverStatus.server_version);
  return false;
}

async function cacheUniverse(useCache: boolean, type: string, fetchFunction: () => Promise<number[] | undefined>): Promise<INamesData[]> {
  const savePath = `${dataFolder}/${type}.json`;

  if (useCache) {
    const cachedData = readFileContents(savePath, true);
    if (cachedData) {
      let cachedNames: INamesData[] = [];
      try {
        cachedNames = JSON.parse(cachedData);
        logger.info(`Loaded ${cachedNames.length} ${type} from cache into memory`);
        return cachedNames;
      } catch {
        logger.error(`Could not parse cached ${type} data!`);
      }
    }
  }

  logger.info(`No cached ${type} found, updating from API`);

  const data = await fetchFunction();
  if (data) {
    const names = await fetchUniverseNames(data);
    if (names.length === data.length) {
      fs.writeFileSync(savePath, JSON.stringify(names));
      logger.info(`Wrote ${names.length} ${type} to cache at ${savePath} and loaded into memory`);
      return names;
    } else {
      logger.error(`Name data for ${type} was incomplete!`);
    }
  } else {
    logger.error(`Could not get ${type} from EVE Online API`);
    if (!useCache) {
      // Attempt to load from cache if we didn't try that already.
      logger.error(`Attempting to get ${type} from cache`);
      return cacheUniverse(true, type, fetchFunction);
    }
  }
  return [];
}

export async function checkAndUpdateCitadelCache(): Promise<void> {
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
