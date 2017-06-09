import { CitadelData, MarketData } from '../typings';
import fetch from 'node-fetch';
import { logger } from './program-logger';
import { sortArrayByObjectProperty } from './arrays';

export async function fetchItemPrice(itemId, regionId) {
  const host = 'https://api.eve-central.com/api/marketstat/json';
  const url = `${host}?typeid=${itemId}&regionlimit=${regionId}`;

  logger.debug(url);
  const refreshResponse = await fetch(url).catch(async (errorResponse) => {
    logger.error('Request failed:', url, errorResponse);
    return null;
  });
  if (refreshResponse) {
    return await refreshResponse.json().catch(() => {
      return {};
    });
  }
}

export async function fetchMarketData(itemId, regionId): Promise<Array<MarketData>> {
  const host = 'https://esi.tech.ccp.is/';
  const path = `v1/markets/${regionId}/orders/?type_id=${itemId}`;
  const url = host + path;

  logger.debug(url);
  const refreshResponse = await fetch(url).catch((errorResponse) => {
    logger.error('Request failed:', url, errorResponse);
    return null;
  });
  if (refreshResponse) {
    return await refreshResponse.json().catch(() => {
      return [];
    });
  }
}

export async function getCheapestOrder(type: 'buy' | 'sell', itemId: number, regionId: number): Promise<MarketData> {
  const marketData = await fetchMarketData(itemId, regionId);
  if (marketData && marketData.length) {
    if (type === 'sell') {
      const sellOrders = marketData.filter(_ => _.is_buy_order === false);
      const sortedSellOrders: Array<MarketData> = sortArrayByObjectProperty(sellOrders, 'price');
      return sortedSellOrders[0];
    } else if (type === 'buy') {
      const buyOrders = marketData.filter(_ => _.is_buy_order === true);
      const sortedBuyOrders: Array<MarketData> = sortArrayByObjectProperty(buyOrders, 'price', true);
      return sortedBuyOrders[0];
    }
  }
  return null;
}

export async function fetchCitadelData(): Promise<CitadelData> {
  const host = 'https://stop.hammerti.me.uk/';
  const path = `api/citadel/all`;
  const url = host + path;

  const citadelResponse = await fetch(url, {timeout: 5000}).catch((errorResponse) => {
    logger.error('Request failed:', url, errorResponse);
    return null;
  });
  if (citadelResponse) {
    return await citadelResponse.json();
  }
  return {};
}
