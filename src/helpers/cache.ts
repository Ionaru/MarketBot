import * as fs from 'fs';
import * as Fuse from 'fuse.js';
import * as moment from 'moment';
import { logger } from 'winston-pnp-logger';

import { dataFolder } from '../market-bot';
import { ICitadelData, INamesData } from '../typings';
import {
  fetchCitadelData,
  fetchServerStatus,
  fetchUniverseNames,
  fetchUniverseRegions,
  fetchUniverseSystems,
  fetchUniverseTypes,
} from './api';
import { formatNumber } from './formatters';
import { createFuse } from './items-loader';
import { readFileContents } from './readers';

export let regions: INamesData[];
export let systems: INamesData[];
export let items: INamesData[];

export let itemsFuse: Fuse<INamesData>;
export let regionsFuse: Fuse<INamesData>;

export let citadels: ICitadelData;

interface IValidateCacheReturn {
  useCache: boolean;
  serverVersion?: string;
}

const serverVersionFileName = 'server_version.txt';

export async function checkAndUpdateCache() {
  const {useCache, serverVersion}: IValidateCacheReturn = await validateCache();

  const newRegions = await cacheUniverse(useCache, 'regions', fetchUniverseRegions);
  const newSystems = await cacheUniverse(useCache, 'systems', fetchUniverseSystems);
  const newItems = await cacheUniverse(useCache, 'items', fetchUniverseTypes);

  if (!newRegions.length || !newSystems.length || !newItems.length) {
    fs.unlinkSync(`${dataFolder}/${serverVersionFileName}`);
    throw new Error('Universe data incomplete, unable to create new cache');
  }

  regions = newRegions;
  regionsFuse = createFuse(regions);
  systems = newSystems;
  items = newItems;
  itemsFuse = createFuse(items);

  let noon = moment.utc().hours(12).minute(0).second(0).millisecond(0);
  if (moment.utc().isAfter(noon)) {
    noon = noon.add(1, 'day');
  }
  const timeUntilNextNoon = noon.valueOf() - Date.now();
  logger.debug(`Next cache check in ${formatNumber(timeUntilNextNoon / 3600000, 2)} hours`);
  setTimeout(() => {
    checkAndUpdateCache().catch((error: Error) => {
      logger.error(error.stack as string);
      logger.error('An error prevented a cache update, attempting to re-use the old cache');
    });
  }, timeUntilNextNoon);

  fs.writeFileSync(`${dataFolder}/${serverVersionFileName}`, serverVersion);
}

async function validateCache(): Promise<IValidateCacheReturn> {
  const serverVersionFilePath = `${dataFolder}/${serverVersionFileName}`;

  const serverVersion = readFileContents(serverVersionFilePath, true);

  const serverStatus = await fetchServerStatus();

  if (!serverStatus) {
    logger.error('Could not get EVE Online server status, using cache if possible');
    // Return true so the cache is used.
    return {useCache: true, serverVersion: undefined};
  }

  if (serverStatus.server_version === serverVersion) {
    logger.info(`EVE Online server version matches saved version, using cache`);
    return {useCache: true, serverVersion: serverStatus.server_version};
  }

  logger.info(`EVE Online server version does not match saved version (or there is no saved version), cache invalid`);
  return {useCache: false, serverVersion: serverStatus.server_version};
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

  logger.info(`No valid cached ${type} available, updating from API`);

  const data = await fetchFunction();
  if (data) {
    const names = await fetchUniverseNames(data).catch(() => []);
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
      return cacheUniverse(true, type, fetchFunction).catch(() => []);
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
