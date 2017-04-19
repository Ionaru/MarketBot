import { MarketData } from '../typings';
import fetch from 'node-fetch';
import { logger } from './program-logger';

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
