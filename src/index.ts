import { format } from 'util';

// eslint-disable-next-line import/order
import { config } from 'dotenv';
config();

import Bugsnag from '@bugsnag/js';
import { Configurator } from '@ionaru/configurator';
import { CacheController, PublicESIService } from '@ionaru/esi-service';
import { HttpsAgent } from 'agentkeepalive';
import axios, { AxiosInstance } from 'axios';
import elastic from 'elastic-apm-node';
import 'reflect-metadata'; // Required for TypeORM

import { version } from '../package.json';

import { debug } from './debug';
import { activate, deactivate } from './market-bot';

export const configPath = 'config';
export let configuration: Configurator;
export let esiService: PublicESIService;
export let esiCache: CacheController;
export let axiosInstance: AxiosInstance;

/**
 * The code in this file starts the bot by calling the async 'activate' function.
 * It also defines what to do on exit signals, unhandled exceptions and promise rejections.
 */
(() => {

    debug(`NodeJS version ${process.version}`);

    configuration = new Configurator(configPath, 'marketbot');

    if (configuration.getProperty('bugsnag.enabled') as boolean) {
        Bugsnag.start({
            apiKey: configuration.getProperty('bugsnag.api') as string,
            appVersion: version,
        });
    }

    debug('Creating axios instance');
    axiosInstance = axios.create({
        // keepAlive pools and reuses TCP connections, so it's faster
        httpsAgent: new HttpsAgent(),

        // cap the maximum content length we'll accept to 50MBs, just in case
        maxContentLength: 50 * 1000 * 1000,

        // follow up to 10 HTTP 3xx redirects
        maxRedirects: 10,

        // 60 sec timeout
        timeout: 60000,
    });

    debug('Creating CacheController instance');
    esiCache = new CacheController('data/responseCache.json', undefined, debug);

    debug('Creating PublicESIService instance');
    esiService = new PublicESIService({
        axiosInstance,
        cacheController: esiCache,
        debug,
        onRouteWarning: (route, text) => {
            Bugsnag.leaveBreadcrumb('route', {route});
            Bugsnag.notify(text || 'Route warning', (event) => {
                event.severity = 'warning';
            });
        },
    });

    if (configuration.getProperty('elastic.enabled') === true) {
        elastic.start({
            secretToken: configuration.getProperty('elastic.token') as string,
            serverUrl: configuration.getProperty('elastic.url') as string,
            serviceName: 'marketbot',
        });
        debug(`Elastic APM enabled, logging to '${configuration.getProperty('elastic.url')}'`);
    }

    process.on('unhandledRejection', (reason, p): void => {
        process.stderr.write(`Unhandled Rejection at: \nPromise ${format(p)} \nReason: ${format(reason)}\n`);
    });
    process.on('uncaughtException', (error) => {
        process.stderr.write(`Uncaught Exception! \n${format(error)}\n`);
        deactivate(true, true).then();
    });
    process.on('SIGINT', () => {
        deactivate(true).then();
    });
    process.on('SIGTERM', () => {
        deactivate(true).then();
    });

    activate().then();
})();
