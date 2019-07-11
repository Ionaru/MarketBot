import { sortArrayByObjectProperty } from '@ionaru/array-utils';
import {
    EVE,
    IMarketGroupData,
    IMarketHistoryData,
    IMarketOrdersData,
    IMarketOrdersDataUnit,
    IStatusData,
    IUniverseCategoryData,
    IUniverseGroupData,
    IUniverseNamesData,
    IUniverseTypeData,
} from '@ionaru/eve-utils';
import * as Sentry from '@sentry/node';
import { logger } from 'winston-pnp-logger';

import { axiosInstance, debug, esiCache, esiService } from '../index';
import { ICitadelData, IEVEMarketerData } from '../typings';

const apiDebug = debug.extend('api');

export async function fetchPriceData(itemId: number, locationId: number): Promise<IEVEMarketerData[] | undefined> {
    const locationType = locationId < 30000000 ? 'regionlimit' : 'usesystem';

    const host = 'https://api.evemarketer.com/ec/';
    const url = `${host}marketstat/json?typeid=${itemId}&${locationType}=${locationId}`;

    return fetchData<IEVEMarketerData[]>(url);
}

export async function fetchMarketData(itemId: number, regionId: number, orderType?: 'buy' | 'sell' | 'all'): Promise<IMarketOrdersData> {
    const marketResponse = await fetchData<IMarketOrdersData>(EVE.getMarketOrdersUrl(regionId, itemId, 1, orderType));
    return marketResponse || [];
}

export async function getCheapestOrder(type: 'buy' | 'sell', itemId: number, regionId: number): Promise<IMarketOrdersDataUnit | undefined> {
    const marketData = await fetchMarketData(itemId, regionId);
    if (marketData && marketData.length) {
        if (type === 'sell') {
            const sellOrders = marketData.filter((entry) => !entry.is_buy_order);
            const sortedSellOrders: IMarketOrdersData = sortArrayByObjectProperty(sellOrders, 'price');
            return sortedSellOrders[0];
        } else if (type === 'buy') {
            const buyOrders = marketData.filter((entry) => entry.is_buy_order);
            const sortedBuyOrders: IMarketOrdersData = sortArrayByObjectProperty(buyOrders, 'price', true);
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

export async function fetchUniverseNames(ids: number[]): Promise<IUniverseNamesData> {

    const names: IUniverseNamesData = [];

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

async function _fetchUniverseNames(ids: number[]): Promise<IUniverseNamesData> {
    const url = EVE.getUniverseNamesUrl();
    const body = JSON.stringify(ids);

    apiDebug(url, body);
    const namesResponse = await axiosInstance.post<IUniverseNamesData>(url, body).catch(
        (errorResponse) => {
            logger.error('Request failed:', url, errorResponse);
            return undefined;
        });

    return namesResponse ? namesResponse.data : [];
}

export async function fetchUniverseTypes(): Promise<number[]> {

    const types = [];
    let page = 1;
    let errors = 0;
    while (true) {
        const typeData = await fetchData<number[]>(EVE.getUniverseTypesUrl(page));
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

export async function fetchUniverseType(id: number) {
    return fetchData<IUniverseTypeData>(EVE.getUniverseTypeUrl(id));
}

export async function fetchUniverseSystems(): Promise<number[]> {
    return await fetchData<number[]>(EVE.getUniverseSystemsUrl()) || [];
}

export async function fetchUniverseRegions() {
    return await fetchData<number[]>(EVE.getUniverseRegionsUrl()) || [];
}

export async function fetchHistoryData(itemId: number, regionId: number) {
    return fetchData<IMarketHistoryData>(EVE.getMarketHistoryUrl(regionId, itemId));
}

export async function fetchGroup(groupId: number) {
    return fetchData<IUniverseGroupData>(EVE.getUniverseGroupUrl(groupId));
}

export async function fetchMarketGroup(groupId: number) {
    return fetchData<IMarketGroupData>(EVE.getMarketGroupUrl(groupId));
}

export async function fetchCategory(categoryId: number) {
    return fetchData<IUniverseCategoryData>(EVE.getUniverseCategoryUrl(categoryId));
}

export async function fetchServerStatus() {
    return fetchData<IStatusData>(EVE.getStatusUrl());
}

async function fetchData<T>(url: string): Promise<T | undefined> {
    return esiService.fetchESIData<T>(url).catch((error) => {
        Sentry.setContext('url', {url});
        Sentry.captureException(error);

        if (esiCache.responseCache[url]) {
            process.emitWarning(`Request failed: ${url} using cached data.`);
            return esiCache.responseCache[url]!.data as T;
        }
        process.emitWarning(`Request failed: ${url}`);
        return;
    });
}
