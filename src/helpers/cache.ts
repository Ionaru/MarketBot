import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';
import fs from 'fs';
import Fuse from 'fuse.js';
import moment from 'moment';

import { debug } from '../index';
import { dataFolder } from '../market-bot';
import { ICitadelData } from '../typings';
import {
    fetchCitadelData,
    fetchServerStatus,
    fetchUniverseNames,
    fetchUniverseRegions,
    fetchUniverseSystems,
    fetchUniverseTypes,
} from './api';
import { createFuse } from './items-loader';
import { readFileContents } from './readers';

export let regions: IUniverseNamesData;
export let systems: IUniverseNamesData;
export let items: IUniverseNamesData;

export let itemsFuse: Fuse<IUniverseNamesDataUnit, {}>;
export let regionsFuse: Fuse<IUniverseNamesDataUnit, {}>;

export let citadels: ICitadelData;

interface IValidateCacheReturn {
    useCache: boolean;
    serverVersion?: string;
}

const cacheDebug = debug.extend('cache');

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
    cacheDebug(`Next cache check in ${formatNumber(timeUntilNextNoon / 3600000, 2)} hours`);
    setTimeout(() => {
        checkAndUpdateCache().catch((error: Error) => {
            process.stderr.write(error.stack as string + '\n');
            process.stderr.write('An error prevented a cache update, attempting to re-use the old cache\n');
        });
    }, timeUntilNextNoon);

    fs.writeFileSync(`${dataFolder}/${serverVersionFileName}`, serverVersion || '');
}

async function validateCache(): Promise<IValidateCacheReturn> {
    const serverVersionFilePath = `${dataFolder}/${serverVersionFileName}`;

    const serverVersion = readFileContents(serverVersionFilePath, true);

    const serverStatus = await fetchServerStatus();

    if (!serverStatus) {
        process.stderr.write('Could not get EVE Online server status, using cache if possible\n');
        // Return true so the cache is used.
        return {useCache: true, serverVersion: undefined};
    }

    if (serverStatus.server_version === serverVersion) {
        cacheDebug(`EVE Online server version matches saved version, using cache`);
        return {useCache: true, serverVersion: serverStatus.server_version};
    }

    cacheDebug(`EVE Online server version does not match saved version (or there is no saved version), cache invalid`);
    return {useCache: false, serverVersion: serverStatus.server_version};
}

async function cacheUniverse(useCache: boolean, type: string, fetchFunction: () => Promise<number[]>): Promise<IUniverseNamesData> {
    const savePath = `${dataFolder}/${type}.json`;

    if (useCache) {
        const cachedData = readFileContents(savePath, true);
        if (cachedData) {
            let cachedNames: IUniverseNamesData = [];
            try {
                cachedNames = JSON.parse(cachedData);
                cacheDebug(`Loaded ${cachedNames.length} ${type} from cache into memory`);
                return cachedNames;
            } catch {
                process.stderr.write(`Could not parse cached ${type} data!\n`);
            }
        }
    }

    cacheDebug(`No valid cached ${type} available, updating from API`);

    const data = await fetchFunction();
    if (data) {
        const names = await fetchUniverseNames(data).catch(() => []);
        if (names.length === data.length) {
            fs.writeFileSync(savePath, JSON.stringify(names));
            cacheDebug(`Wrote ${names.length} ${type} to cache at ${savePath} and loaded into memory`);
            return names;
        } else {
            process.stderr.write(`Name data for ${type} was incomplete!\n`);
        }
    } else {
        process.stderr.write(`Could not get ${type} from EVE Online API\n`);
        if (!useCache) {
            // Attempt to load from cache if we didn't try that already.
            process.emitWarning(`Attempting to get ${type} from cache`);
            return cacheUniverse(true, type, fetchFunction).catch(() => []);
        }
    }
    return [];
}

export async function checkAndUpdateCitadelCache(): Promise<void> {
    cacheDebug(`Fetching known citadels from kalkoken.org API`);

    citadels = await fetchCitadelData().catch((error) => {
        process.stderr.write(error + '\n');
        return {};
    });

    // Schedule a refresh of the citadel list every 6 hours.
    setInterval(async () => {
        const newCitadels = await fetchCitadelData().catch(() => {
            return {};
        });
        if (Object.keys(newCitadels).length && newCitadels.toString() !== citadels.toString()) {
            citadels = newCitadels;
            cacheDebug('Citadel data updated');
        }
    }, 6 * 60 * 60 * 1000); // 6 hours

    cacheDebug(`${Object.keys(citadels).length} citadels loaded into memory`);
}
