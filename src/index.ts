import { logger, WinstonPnPLogger } from 'winston-pnp-logger';

import { activate, deactivate } from './market-bot';

/**
 * The code in this file starts the bot by calling the async 'activate' function.
 * It also defines what to do on exit signals, unhandled exceptions and promise rejections.
 */

new WinstonPnPLogger({
  announceSelf: false,
  logDir: 'logs'
});

logger.debug('Running NodeJS ' + process.version);

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
