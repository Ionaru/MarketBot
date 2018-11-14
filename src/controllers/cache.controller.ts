import { existsSync, readFileSync, writeFileSync } from 'fs';
import { logger } from 'winston-pnp-logger';

interface IResponseCache {
  [index: string]: ICacheObject;
}

interface ICacheObject {
  expiry?: number;
  etag?: string;
  data: any;
}

export class CacheController {

  public static responseCache: IResponseCache = {};

  public static isExpired = (cache: ICacheObject) => cache.expiry ? cache.expiry < Date.now() : true;

  public static dumpCache() {
    const cacheString = JSON.stringify(CacheController.responseCache);
    writeFileSync('data/responseCache.json', cacheString);
  }

  public static readCache() {
    if (existsSync('data/responseCache.json')) {
      const cacheString = readFileSync('data/responseCache.json').toString();
      let cacheJson;
      try {
        cacheJson = JSON.parse(cacheString);
      } catch (error) {
        logger.warn(error.message);
      }

      if (cacheJson) {
        CacheController.responseCache = cacheJson;
        logger.info(`${Object.keys(cacheJson).length} cached responses loaded into memory`);
      }
    }
  }
}
