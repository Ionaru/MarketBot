// Create and export the debug instance so imported classes can create extensions of it.
import Debug from 'debug';
export const debug = Debug('market-bot');

import { Configurator } from '@ionaru/configurator';
import * as Sentry from '@sentry/node';
import * as elastic from 'elastic-apm-node';
import 'reflect-metadata'; // Required for TypeORM
import { logger, WinstonPnPLogger } from 'winston-pnp-logger';

import { version } from '../package.json';
import { activate, deactivate } from './market-bot';

/**
 * The code in this file starts the bot by calling the async 'activate' function.
 * It also defines what to do on exit signals, unhandled exceptions and promise rejections.
 */

new WinstonPnPLogger({
    announceSelf: false,
    logDir: 'logs',
});

logger.info(`NodeJS version ${process.version}`);

export const configuration = new Configurator('config', 'marketbot');

Sentry.init({
    dsn: configuration.getProperty('sentry.dsn') as string,
    enabled: configuration.getProperty('sentry.enabled') as boolean,
    release: version,
});

if (configuration.getProperty('elastic.enabled') === true) {
    elastic.start({
        secretToken: configuration.getProperty('elastic.token') as string,
        serverUrl: configuration.getProperty('elastic.url') as string,
        serviceName: 'marketbot',
    });
    logger.info(`Elastic APM enabled, logging to '${configuration.getProperty('elastic.url')}'`);
}

activate().then();

process.stdin.resume();
process.on('unhandledRejection', (reason, p): void => {
    logger.error('Unhandled Rejection at: Promise', p, '\nreason:', reason);
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception!', error);
    deactivate(true, true).then();
});
process.on('SIGINT', () => {
    deactivate(true).then();
});
process.on('SIGTERM', () => {
    deactivate(true).then();
});
