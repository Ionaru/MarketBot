import { sortArrayByObjectProperty } from '@ionaru/array-utils';
import * as Sentry from '@sentry/node';
import fetch, { FetchError, Response } from 'node-fetch';
import { logger } from 'winston-pnp-logger';

import { esiCache, esiService } from '../index';
import {
    ICategory,
    ICitadelData,
    IEVEMarketerData,
    IGroup,
    IHistoryData,
    IMarketData,
    IMarketGroup,
    INamesData,
    IServerStatus,
    ITypeData,
} from '../typings';

const ccpHost = 'https://esi.evetech.net/';

export async function fetchPriceData(itemId: number, locationId: number): Promise<IEVEMarketerData[] | undefined> {
    const locationType = locationId < 30000000 ? 'regionlimit' : 'usesystem';

    const host = 'https://api.evemarketer.com/ec/';
    const url = `${host}marketstat/json?typeid=${itemId}&${locationType}=${locationId}`;

    return fetchData<IEVEMarketerData[]>(url);
}

export async function fetchMarketData(itemId: number, regionId: number): Promise<IMarketData[]> {
    const path = `v1/markets/${regionId}/orders/?type_id=${itemId}`;
    const url = ccpHost + path;

    const marketResponse = await fetchData<IMarketData[]>(url);
    return marketResponse || [];
}

export async function getCheapestOrder(type: 'buy' | 'sell', itemId: number, regionId: number): Promise<IMarketData | undefined> {
    const marketData = await fetchMarketData(itemId, regionId);
    if (marketData && marketData.length) {
        if (type === 'sell') {
            const sellOrders = marketData.filter((entry) => !entry.is_buy_order);
            const sortedSellOrders: IMarketData[] = sortArrayByObjectProperty(sellOrders, 'price');
            return sortedSellOrders[0];
        } else if (type === 'buy') {
            const buyOrders = marketData.filter((entry) => entry.is_buy_order);
            const sortedBuyOrders: IMarketData[] = sortArrayByObjectProperty(buyOrders, 'price', true);
            return sortedBuyOrders[0];
        }
    }
    return undefined;
}

export async function fetchCitadelData(): Promise<ICitadelData> {
    const url = 'https://stop.hammerti.me.uk/api/citadel/all';

    const citadelData = await fetchData<ICitadelData>(url);
    return citadelData || {};
}

export async function fetchUniverseNames(ids: number[]): Promise<INamesData[]> {

    const names: INamesData[] = [];

    const idsCopy = ids.slice();

    while (true) {
        const idsPart = idsCopy.splice(0, 1000);
        const namesPart = await _fetchUniverseNames(idsPart);
        names.push(...namesPart);

        if (idsPart.length < 1000) {
            return names;
        }
    }
}

async function _fetchUniverseNames(ids: number[]): Promise<INamesData[]> {
    const path = 'v2/universe/names/';
    const url = ccpHost + path;
    const headers = {'Content-Type': 'application/json'};
    const body = JSON.stringify(ids);

    logger.debug(url, body);
    const namesResponse: Response | undefined = await fetch(url, {body, method: 'POST', headers}).catch(
        (errorResponse: FetchError) => {
            logger.error('Request failed:', url, errorResponse);
            return undefined;
        });

    if (namesResponse) {
        if (namesResponse.ok) {
            return namesResponse.json().catch((error) => {
                logger.error('Unable to parse JSON:', error);
                return [];
            });
        } else {
            const text = await namesResponse.text();
            logger.error('Request not OK:', url, namesResponse.status, namesResponse.statusText, text);
        }
    }
    return [];
}

export async function fetchUniverseTypes(): Promise<number[] | undefined> {

    const types = [];
    let page = 1;
    let errors = 0;
    while (true) {
        const typeData = await fetchData<number[]>(ccpHost + `v1/universe/types?page=${page}`);
        if (typeData) {
            types.push(...typeData);
            if (typeData.length < 1000) {
                return types;
            }
            page++;
        } else {
            errors++;
        }

        if (errors >= 5) {
            throw new Error('Too many request failures');
        }
    }
}

export async function fetchUniverseType(id: number): Promise<ITypeData | undefined> {
    return fetchData<ITypeData>(ccpHost + `v3/universe/types/${id}`);
}

export async function fetchUniverseSystems(): Promise<number[] | undefined> {
    return fetchData<number[]>(ccpHost + `v1/universe/systems`);
}

export async function fetchUniverseRegions(): Promise<number[] | undefined> {
    return fetchData<number[]>(ccpHost + `v1/universe/regions`);
}

export async function fetchHistoryData(itemId: number, regionId: number) {
    return fetchData<IHistoryData[]>(ccpHost + `v1/markets/${regionId}/history/?type_id=${itemId}`);
}

export async function fetchGroup(groupId: number) {
    return fetchData<IGroup>(ccpHost + `v1/universe/groups/${groupId}`);
}

export async function fetchMarketGroup(groupId: number) {
    return fetchData<IMarketGroup>(ccpHost + `v1/markets/groups/${groupId}`);
}

export async function fetchCategory(categoryId: number) {
    return fetchData<ICategory>(ccpHost + `v1/universe/categories/${categoryId}`);
}

export async function fetchServerStatus() {
    return fetchData<IServerStatus>(ccpHost + 'v1/status/');
}

async function fetchData<T>(url: string): Promise<T> {
    return esiService.fetchESIData<T>(url).catch((error) => {
        if (esiCache.responseCache[url]) {
            return esiCache.responseCache[url]!.data;
        }
        Sentry.setContext('url', {url});
        throw error;
    });
}
