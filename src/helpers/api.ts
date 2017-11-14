import 'isomorphic-fetch';
import { logger } from 'winston-pnp-logger';

import { ICitadelData, IHistoryData, IMarketData, INamesData } from '../typings';
import { sortArrayByObjectProperty } from './arrays';

const ccpHost = 'https://esi.tech.ccp.is/';

export async function fetchPriceData(itemId: number, regionId: number) {
  const host = 'https://api.eve-central.com/api/';
  const url = `${host}marketstat/json?typeid=${itemId}&regionlimit=${regionId}`;

  logger.debug(url);
  const priceResponse: Response | undefined = await fetch(url).catch((errorResponse) => {
    logger.error('Request failed:', url, errorResponse);
    return fetchPriceDataBackup(itemId, regionId);
  });
  if (priceResponse) {
    return priceResponse.json().catch((error) => {
      logger.error('Unable to parse JSON:', error);
      return fetchPriceDataBackup(itemId, regionId);
    });
  }
}

export async function fetchPriceDataBackup(itemId: number, regionId: number) {
  logger.warn('Unable to fetch from EVE-Central, using backup: EVEMarketer');
  const host = 'https://api.evemarketer.com/ec/';
  const url = `${host}marketstat/json?typeid=${itemId}&regionlimit=${regionId}`;

  logger.debug(url);
  const priceResponse: Response | undefined = await fetch(url).catch(async (errorResponse) => {
    logger.error('Request failed:', url, errorResponse);
    return undefined;
  });
  if (priceResponse) {
    return priceResponse.json().catch((error) => {
      logger.error('Unable to parse JSON:', error);
      return {};
    });
  }
}

export async function fetchMarketData(itemId: number, regionId: number): Promise<IMarketData[]> {
  const path = `v1/markets/${regionId}/orders/?type_id=${itemId}`;
  const url = ccpHost + path;

  logger.debug(url);
  const marketResponse: Response | undefined = await fetch(url).catch((errorResponse) => {
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
      logger.error('Request not OK:', url, marketResponse);
    }
  }
  return [];
}

export async function getCheapestOrder(type: 'buy' | 'sell', itemId: number, regionId: number): Promise<IMarketData | undefined> {
  const marketData = await fetchMarketData(itemId, regionId);
  if (marketData && marketData.length) {
    if (type === 'sell') {
      const sellOrders = marketData.filter((_) => _.is_buy_order === false);
      const sortedSellOrders: IMarketData[] = sortArrayByObjectProperty(sellOrders, 'price');
      return sortedSellOrders[0];
    } else if (type === 'buy') {
      const buyOrders = marketData.filter((_) => _.is_buy_order === true);
      const sortedBuyOrders: IMarketData[] = sortArrayByObjectProperty(buyOrders, 'price', true);
      return sortedBuyOrders[0];
    }
  }
  return undefined;
}

export async function fetchCitadelData(): Promise<ICitadelData> {
  const host = 'https://stop.hammerti.me.uk/';
  const path = `api/citadel/all`;
  const url = host + path;

  logger.debug(url);
  const citadelResponse: Response | undefined = await fetch(url).catch((errorResponse) => {
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
      logger.error('Request not OK:', url, citadelResponse);
    }
  }
  return {};
}

export async function fetchUniverseNames(ids: number[]): Promise<INamesData[]> {
  const path = 'v2/universe/names/';
  const url = ccpHost + path;
  const idData = JSON.stringify(ids);

  logger.debug(url, idData);
  const namesResponse: Response | undefined = await fetch(url, {body: idData, method: 'POST'}).catch(
    (errorResponse) => {
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
      logger.error('Request not OK:', url, namesResponse);
    }
  }
  return [];
}

export async function fetchHistoryData(itemId: number, regionId: number): Promise<IHistoryData[] | undefined> {
  const path = `v1/markets/${regionId}/history/?type_id=${itemId}`;
  const url = ccpHost + path;

  logger.debug(url);
  const historyResponse: Response | undefined = await fetch(url).catch((errorResponse) => {
    logger.error('Request failed:', url, errorResponse);
    return undefined;
  });
  if (historyResponse) {
    if (historyResponse.ok) {
      return historyResponse.json().catch((error) => {
        logger.error('Unable to parse JSON:', error);
        return undefined;
      });
    } else {
      logger.error('Request not OK:', url, historyResponse);
    }
  }
  return undefined;
}
