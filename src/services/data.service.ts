import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as httpStatus from 'http-status-codes';
import { logger } from 'winston-pnp-logger';

import { CacheController } from '../controllers/cache.controller';

export class DataService {

  public static deprecationsLogged: string[] = [];

  public static async fetchESIData<T>(url: string, cacheTime?: number): Promise<T | undefined> {

    if (CacheController.responseCache[url] && !CacheController.isExpired(CacheController.responseCache[url])) {
      return CacheController.responseCache[url].data as T;
    }

    const requestConfig: AxiosRequestConfig = {
      // Make sure 304 responses are not treated as errors.
      validateStatus: (status) => status === httpStatus.OK || status === httpStatus.NOT_MODIFIED,
    };

    if (CacheController.responseCache[url] && CacheController.responseCache[url].etag) {
      requestConfig.headers = {
        'If-None-Match': `${CacheController.responseCache[url].etag}`,
      };
    }

    const response = await axios.get<T>(url, requestConfig).catch((error: AxiosError) => {
      logger.error('Request failed:', url, error.message);
      return undefined;
    });

    if (response) {
      logger.debug(`${url} => ${response.status} ${response.statusText}`);
      if (response.status === httpStatus.OK) {
        if (response.headers.warning) {
          DataService.logWarning(url, response.headers.warning);
        }

        if (response.headers.expires || response.headers.etag) {
          CacheController.responseCache[url] = {
            data: response.data,
          };

          if (response.headers.etag) {
            CacheController.responseCache[url].etag = response.headers.etag;
          }

          CacheController.responseCache[url].expiry =
            response.headers.expires ? new Date(response.headers.expires).getTime() : Date.now() + 300000;

        } else if (cacheTime) {
          CacheController.responseCache[url] = {
            data: response.data,
            expiry: Date.now() + cacheTime,
          };
        }

        return response.data;

      } else if (response.status === httpStatus.NOT_MODIFIED) {

        CacheController.responseCache[url].expiry =
          response.headers.expires ? new Date(response.headers.expires).getTime() : Date.now() + 300000;

        return CacheController.responseCache[url].data as T;

      } else {
        logger.error('Request not OK:', url, response.status, response.statusText, response.data);
      }
    }

    return;
  }

  public static logWarning(route: string, text?: string) {
    if (!DataService.deprecationsLogged.includes(route)) {
      logger.warn('HTTP request warning:', route, text);
      DataService.deprecationsLogged.push(route);
    }
  }
}
