import * as elastic from 'elastic-apm-node';
import { logger, WinstonPnPLogger } from 'winston-pnp-logger';

import { Configurator } from './helpers/configurator';
import { activate, deactivate } from './market-bot';

/**
 * The code in this file starts the bot by calling the async 'activate' function.
 * It also defines what to do on exit signals, unhandled exceptions and promise rejections.
 */

new WinstonPnPLogger({
  announceSelf: false,
  logDir: 'logs'
});

logger.info(`NodeJS version ${process.version}`);

const configuration = new Configurator();
configuration.addConfigFile('marketbot');

if (configuration.getProperty('elastic.enabled') === true) {
  elastic.start({
    appName: 'marketbot',
    secretToken: configuration.getProperty('elastic.token'),
    serverUrl: configuration.getProperty('elastic.url')
  });
  logger.info(`Elastic APM enabled, logging to '${configuration.getProperty('elastic.url')}'`);
}

activate().then();

process.stdin.resume();
process.on('unhandledRejection', (reason: string, p: Promise<any>): void => {
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
