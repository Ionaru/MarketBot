import * as Sentry from '@sentry/node';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as httpStatus from 'http-status-codes';
import { logger } from 'winston-pnp-logger';

import { CacheController } from '../controllers/cache.controller';

export function validateStatus(status: number) {
  // Make sure 304 responses are not treated as errors.
  return status === httpStatus.OK || status === httpStatus.NOT_MODIFIED;
}

export class DataService {

  public static deprecationsLogged: string[] = [];

  public static async fetchESIData<T>(url: string, cacheTime?: number): Promise<T | undefined> {

    if (CacheController.responseCache[url] && !CacheController.isExpired(CacheController.responseCache[url])) {
      return CacheController.responseCache[url].data as T;
    }

    const requestConfig = DataService.getESIRequestConfig(url);
    const requestConfig: AxiosRequestConfig = {validateStatus};

    const response = await axios.get<T>(url, requestConfig).catch((error: AxiosError) => {
      DataService.reportRequestError(url, error);
      logger.error('Request failed:', url, error.message);
      return undefined;
    });

    if (response) {
      logger.debug(`${url} => ${response.status} ${response.statusText}`);
      if (response.status === httpStatus.OK) {
        if (response.headers.warning) {
          DataService.logWarning(url, response.headers.warning);
        }

        DataService.cacheResponse(url, response, cacheTime);

        return response.data;

      } else if (response.status === httpStatus.NOT_MODIFIED) {

        CacheController.responseCache[url].expiry =
          response.headers.expires ? new Date(response.headers.expires).getTime() : Date.now() + 300000;

        return CacheController.responseCache[url].data as T;
      }
    }

    return;
  }

  public static logWarning(route: string, text: string) {
    if (!DataService.deprecationsLogged.includes(route)) {
      Sentry.addBreadcrumb({
        category: 'route',
        message: route,
      });
      Sentry.captureMessage(text, Sentry.Severity.Warning);
      logger.warn('HTTP request warning:', route, text);
      DataService.deprecationsLogged.push(route);
    }
  }

  private static cacheResponse(url: string, response: AxiosResponse, alternateCacheTime?: number) {
    if (response.headers.expires || response.headers.etag) {
      CacheController.responseCache[url] = {
        data: response.data,
      };

      if (response.headers.etag) {
        CacheController.responseCache[url].etag = response.headers.etag;
      }

      CacheController.responseCache[url].expiry =
        response.headers.expires ? new Date(response.headers.expires).getTime() : Date.now() + 300000;

    } else if (alternateCacheTime) {
      CacheController.responseCache[url] = {
        data: response.data,
        expiry: Date.now() + alternateCacheTime,
      };
    }
  }

  private static getESIRequestConfig(url: string): AxiosRequestConfig {
    const requestConfig: AxiosRequestConfig = {
      // Make sure 304 responses are not treated as errors.
      validateStatus: (status) => status === httpStatus.OK || status === httpStatus.NOT_MODIFIED,
    };

    if (CacheController.responseCache[url] && CacheController.responseCache[url].etag) {
      requestConfig.headers = {
        'If-None-Match': `${CacheController.responseCache[url].etag}`,
      };
    }

    return requestConfig;
  }

  private static reportRequestError(url: string, error: AxiosError) {
    Sentry.withScope((scope) => {
      scope.addBreadcrumb({
        category: 'url',
        message: url,
      });
      scope.setExtra('response code', error.code || (error.response && error.response.status));
      scope.setExtra('response message', error.message);
      Sentry.captureMessage(`Request failed: ${url}`, Sentry.Severity.Error);
    });
  }
}
