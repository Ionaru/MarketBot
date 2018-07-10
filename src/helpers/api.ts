import fetch, { FetchError, Response } from 'node-fetch';
import { logger } from 'winston-pnp-logger';
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
  ITypeData
} from '../typings';
import { sortArrayByObjectProperty } from './arrays';

const ccpHost = 'https://esi.tech.ccp.is/';

export async function fetchPriceData(itemId: number, locationId: number): Promise<IEVEMarketerData[] | undefined> {
  const locationType = locationId < 30000000 ? 'regionlimit' : 'usesystem';

  const host = 'https://api.evemarketer.com/ec/';
  const url = `${host}marketstat/json?typeid=${itemId}&${locationType}=${locationId}`;

  logger.debug(url);
  const priceResponse: Response | undefined = await fetch(url).catch((errorResponse: FetchError) => {
    logger.error('Request failed:', url, errorResponse);
    return undefined;
  });
  if (priceResponse) {
    return priceResponse.json().catch((error) => {
      logger.error('Unable to parse JSON:', error);
      return [];
    });
  }
  return [];
}

export async function fetchMarketData(itemId: number, regionId: number): Promise<IMarketData[]> {
  const path = `v1/markets/${regionId}/orders/?type_id=${itemId}`;
  const url = ccpHost + path;

  logger.debug(url);
  const marketResponse: Response | undefined = await fetch(url).catch((errorResponse: FetchError) => {
    logger.error('Request failed:', url, errorResponse);
    return undefined;
  });
  if (marketResponse) {
    if (marketResponse.ok) {
      return marketResponse.json().catch((error) => {
        logger.error('Unable to parse JSON:', error);
        return [];
      });
    } else {
      const text = await marketResponse.text();
      logger.error('Request not OK:', url, marketResponse.status, marketResponse.statusText, text);
    }
  }
  return [];
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

  logger.debug(url);
  const citadelResponse: Response | undefined = await fetch(url).catch((errorResponse: FetchError) => {
    logger.error('Request failed:', url, errorResponse);
    return undefined;
  });

  if (citadelResponse) {
    if (citadelResponse.ok) {
      return citadelResponse.json().catch((error) => {
        logger.error('Unable to parse JSON:', error);
        return {};
      });
    } else {
      const text = await citadelResponse.text();
      logger.error('Request not OK:', url, citadelResponse.status, citadelResponse.statusText, text);
    }
  }
  return {};
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
    const typeData = await fetchESIData(`v1/universe/types?page=${page}`) as number[] | undefined;
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
  return fetchESIData(`v3/universe/types/${id}`) as Promise<ITypeData | undefined>;
}

export async function fetchUniverseSystems(): Promise<number[] | undefined> {
  return fetchESIData(`v1/universe/systems`) as Promise<number[] | undefined>;
}

export async function fetchUniverseRegions(): Promise<number[] | undefined> {
  return fetchESIData(`v1/universe/regions`) as Promise<number[] | undefined>;
}

export async function fetchHistoryData(itemId: number, regionId: number): Promise<IHistoryData[] | undefined> {
  return fetchESIData(`v1/markets/${regionId}/history/?type_id=${itemId}`) as Promise<IHistoryData[] | undefined>;
}

export async function fetchGroup(groupId: number): Promise<IGroup | undefined> {
  return fetchESIData(`v1/universe/groups/${groupId}`) as Promise<IGroup | undefined>;
}

export async function fetchMarketGroup(groupId: number): Promise<IMarketGroup | undefined> {
  return fetchESIData(`v1/markets/groups/${groupId}`) as Promise<IMarketGroup | undefined>;
}

export async function fetchCategory(categoryId: number): Promise<ICategory | undefined> {
  return fetchESIData(`v1/universe/categories/${categoryId}`) as Promise<ICategory | undefined>;
}

export async function fetchServerStatus(): Promise<IServerStatus | undefined> {
  return fetchESIData(`v1/status/`) as Promise<IServerStatus | undefined>;
}

async function fetchESIData(path: string): Promise<object | undefined> {
  const url = ccpHost + path;

  logger.debug(url);
  const response: Response | undefined = await fetch(url).catch((errorResponse: FetchError) => {
    logger.error('Request failed:', url, errorResponse);
    return undefined;
  });
  if (response) {
    if (response.ok) {
      return response.json().catch((error) => {
        logger.error('Unable to parse JSON:', error);
        return undefined;
      });
    } else {
      const text = await response.text();
      logger.error('Request not OK:', url, response.status, response.statusText, text);
    }
  }
  return undefined;
}
