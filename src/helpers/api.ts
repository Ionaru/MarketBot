import { URLSearchParams } from 'url';

import Bugsnag from '@bugsnag/js';
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
    IUniverseNamesDataUnit,
    IUniverseTypeData,
} from '@ionaru/eve-utils';

import { version } from '../../package.json';
import { debug } from '../debug';
import { axiosInstance, esiCache, esiService } from '../index';
import { ICitadelData, IEVEPraisalData } from '../typings.d';

const apiDebug = debug.extend('api');

const captureRequestError = (url: string, errorResponse: any) => {
    Bugsnag.addMetadata('url', {url});
    Bugsnag.notify(errorResponse);
    process.emitWarning(`Request failed: ${ url }`);
    process.emitWarning(errorResponse);
    return undefined;
};

export const fetchPriceData = async (item: IUniverseNamesDataUnit, market: string): Promise<IEVEPraisalData | undefined> => {

    const host = 'https://evepraisal.com';

    const params = new URLSearchParams({
        market: market.toLowerCase(),
        persist: 'no',
        raw_textarea: item.name.toLowerCase(),
    });

    const url = `${ host }/appraisal.json?${ params.toString() }`;

    const result = await axiosInstance.post<IEVEPraisalData>(url, undefined, {
        headers: {
            'User-Agent': `MarketBot/${ version } Ionaru#3801`,
        },
    })
        .catch((errorResponse) => captureRequestError(url, errorResponse));

    return result?.data;
};

export const fetchMarketData = async (itemId: number, regionId: number, orderType?: 'buy' | 'sell' | 'all'): Promise<IMarketOrdersData> => {
    const marketResponse = await fetchData<IMarketOrdersData>(EVE.getMarketOrdersUrl({
        orderType,
        page: 1,
        regionId,
        typeId: itemId,
    }));
    return marketResponse || [];
};

// eslint-disable-next-line max-len
export const getCheapestOrder = async (type: 'buy' | 'sell', itemId: number, regionId: number): Promise<IMarketOrdersDataUnit | undefined> => {
    const marketData = await fetchMarketData(itemId, regionId);
    if (marketData && marketData.length) {
        if (type === 'sell') {
            const sellOrders = marketData.filter((entry) => !entry.is_buy_order);
            sortArrayByObjectProperty(sellOrders, (order) => order.price);
            return sellOrders[0];
        } else if (type === 'buy') {
            const buyOrders = marketData.filter((entry) => entry.is_buy_order);
            sortArrayByObjectProperty(buyOrders, (order) => order.price, true);
            return buyOrders[0];
        }
    }
    return undefined;
};

export const fetchCitadelData = async (): Promise<ICitadelData> => {
    const url = 'https://stop.hammerti.me.uk/api/citadel/all';

    const citadelData = await fetchData<ICitadelData>(url);
    return citadelData || {};
};

export const fetchUniverseNames = async (ids: number[]): Promise<IUniverseNamesData> => {

    const names: IUniverseNamesData = [];

    const idsCopy = ids.slice();

    // TODO: Rewrite using X-Pages
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const idsPart = idsCopy.splice(0, 1000);
        const namesPart = await _fetchUniverseNames(idsPart);
        names.push(...namesPart);

        if (idsPart.length < 1000) {
            return names;
        }
    }
};

// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/naming-convention
const _fetchUniverseNames = async (ids: number[]): Promise<IUniverseNamesData> => {
    const url = EVE.getUniverseNamesUrl();
    const body = JSON.stringify(ids);

    apiDebug(url, body);
    const namesResponse = await axiosInstance.post<IUniverseNamesData>(url, body)
        .catch((errorResponse) => captureRequestError(url, errorResponse));

    return namesResponse ? namesResponse.data : [];
};

export const fetchUniverseTypes = async (): Promise<number[]> => {

    const types = [];
    let page = 1;
    let errors = 0;
    // TODO: Rewrite using X-Pages
    // eslint-disable-next-line no-constant-condition
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
};

export const fetchUniverseType = async (id: number) => fetchData<IUniverseTypeData>(EVE.getUniverseTypeUrl(id));

export const fetchUniverseSystems = async (): Promise<number[]> => await fetchData<number[]>(EVE.getUniverseSystemsUrl()) || [];

export const fetchUniverseRegions = async () => await fetchData<number[]>(EVE.getUniverseRegionsUrl()) || [];

// eslint-disable-next-line max-len
export const fetchHistoryData = async (itemId: number, regionId: number) => fetchData<IMarketHistoryData>(EVE.getMarketHistoryUrl(regionId, itemId));

export const fetchGroup = async (groupId: number) => fetchData<IUniverseGroupData>(EVE.getUniverseGroupUrl(groupId));

export const fetchMarketGroup = async (groupId: number) => fetchData<IMarketGroupData>(EVE.getMarketGroupUrl(groupId));

export const fetchCategory = async (categoryId: number) => fetchData<IUniverseCategoryData>(EVE.getUniverseCategoryUrl(categoryId));

export const fetchServerStatus = async () => fetchData<IStatusData>(EVE.getStatusUrl());

const fetchData = async <T>(url: string): Promise<T | undefined> =>
    esiService.fetchESIData<T>(url).catch((error) => {
        Bugsnag.addMetadata('url', {url});
        Bugsnag.notify(error);

        if (esiCache.responseCache[url]) {
            process.emitWarning(`Request failed: ${ url } using cached data.`);
            return esiCache.responseCache[url]?.data as T;
        }
        process.emitWarning(`Request failed: ${ url }`);
        return undefined;
    });
