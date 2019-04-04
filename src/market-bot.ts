import * as Sentry from '@sentry/node';
import * as elastic from 'elastic-apm-node';
import { createConnection } from 'typeorm';
import { logger } from 'winston-pnp-logger';

import { Client } from './chat-service/discord/client';
import { Message } from './chat-service/discord/message';
import { buyOrdersCommand } from './commands/buy-orders';
import { dataCommand } from './commands/data';
import { historyCommand } from './commands/history';
import { infoCommand } from './commands/info';
import { itemCommand } from './commands/item';
import { priceCommand } from './commands/price';
import { sellOrdersCommand } from './commands/sell-orders';
import { clearTrackingCommand, performTrackingCycle, startTrackingCycle, trackCommand, TrackingEntry } from './commands/track';
import { CacheController } from './controllers/cache.controller';
import { checkAndUpdateCache, checkAndUpdateCitadelCache } from './helpers/cache';
import { LogEntry } from './helpers/command-logger';
import { readVersion } from './helpers/readers';
import { createCommandRegex } from './helpers/regex';
import { configuration } from './index';

export const creator = 'Ionaru#3801';
export let version: string;
export const botName = 'MarketBot';

export let client: Client | undefined;

export const dataFolder = 'data';

export const commandPrefix = '/';

export const priceCommands = [
    'price', 'p', 'value',
];
export const historyCommands = [
    'history', 'h',
];
export const dataCommands = [
    'data', 'd', 'stats',
];
export const sellOrdersCommands = [
    'sell-orders', 'sell', 'so', 's',
];
export const buyOrdersCommands = [
    'buy-orders', 'buy', 'bo', 'b',
];
export const infoCommands = [
    'info', 'i', 'about', 'help',
];
export const regionCommands = [
    'region', 'r',
];
export const systemCommands = [
    'system',
];
export const itemCommands = [
    'item', 'id', 'lookup',
];
export const limitCommands = [
    'limit', 'l', 'max',
];
export const sellTrackingCommands = [
    'track-sell-orders', 'tso',
];
export const buyTrackingCommands = [
    'track-buy-orders', 'tbo',
];
export const clearTrackingCommands = [
    'track-clear', 'tc',
];

export const priceCommandRegex = createCommandRegex(priceCommands, true);
export const itemCommandRegex = createCommandRegex(itemCommands, true);
export const historyCommandRegex = createCommandRegex(historyCommands, true);
export const dataCommandRegex = createCommandRegex(dataCommands, true);
export const sellOrdersCommandRegex = createCommandRegex(sellOrdersCommands, true);
export const buyOrdersCommandRegex = createCommandRegex(buyOrdersCommands, true);
export const infoCommandRegex = createCommandRegex(infoCommands, true);
export const sellTrackingCommandRegex = createCommandRegex(sellTrackingCommands, true);
export const buyTrackingCommandRegex = createCommandRegex(buyTrackingCommands, true);
export const clearTrackingCommandRegex = createCommandRegex(clearTrackingCommands, true);
export const regionCommandRegex = createCommandRegex(regionCommands);
export const systemCommandRegex = createCommandRegex(systemCommands);
export const limitCommandRegex = createCommandRegex(limitCommands);

export async function activate() {
    logger.info('Starting bot activation');

    version = readVersion();

    logger.info(`Bot version: ${version}`);

    CacheController.readCache();

    await checkAndUpdateCache().catch((error: Error) => {
        logger.error(error.stack as string);
        logger.error('Unable to create initial cache, bot cannot function!');
        deactivate(true, true).then();
    });
    await checkAndUpdateCitadelCache();

    await createConnection({
        database: 'data/marketbot.db',
        entities: [
            LogEntry, TrackingEntry,
        ],
        synchronize: true,
        type: 'sqlite',
    });

    logger.info(`Database connection created`);

    const token = configuration.getProperty('discord.token');
    if (token && typeof token === 'string') {
        client = new Client(token);

        logger.info(`Logging in...`);
        client.login();
        client.emitter.once('ready', () => {
            if (client) {
                logger.info(`Logged in as ${client.name}`);
                finishActivation();
            }
        });
    } else {
        logger.error(`Discord bot token was not valid, expected a string but got '${token}' of type ${typeof token}`);
    }
}

function finishActivation() {
    performTrackingCycle().then(() => {
        startTrackingCycle();
    });

    if (client) {
        client.emitter.on('message', (message: Message) => {
            let transaction: any;
            if (configuration.getProperty('elastic.enabled') === true) {
                transaction = elastic.startTransaction();
            }
            processMessage(message, transaction).then().catch((error: Error) => {
                handleError(message, error);
            });
        });
        logger.info(`Activation complete, ready for messages!`);
    }
}

export async function deactivate(exitProcess: boolean, error = false): Promise<void> {
    let quitMessage = 'Quitting';
    if (error) {
        quitMessage += ' because of an uncaught error!';
    }

    CacheController.dumpCache();

    logger.info(quitMessage);
    if (client) {
        await client.disconnect();
        client = undefined;
        logger.info('Client destroyed');
    }

    logger.info('Done!');

    if (exitProcess) {
        process.exit(0);
    }
}

async function processMessage(message: Message, transaction: any): Promise<void> {
    const commandPart = message.content.split(' ')[0];
    switch (true) {
        case priceCommandRegex.test(commandPart):
            await priceCommand(message, transaction);
            break;
        case sellOrdersCommandRegex.test(commandPart):
            await sellOrdersCommand(message, transaction);
            break;
        case infoCommandRegex.test(commandPart):
            await infoCommand(message, transaction);
            break;
        case buyOrdersCommandRegex.test(commandPart):
            await buyOrdersCommand(message, transaction);
            break;
        case dataCommandRegex.test(commandPart):
            await dataCommand(message, transaction);
            break;
        case sellTrackingCommandRegex.test(commandPart):
            await trackCommand(message, 'sell', transaction);
            break;
        case itemCommandRegex.test(commandPart):
            await itemCommand(message, transaction);
            break;
        case historyCommandRegex.test(commandPart):
            await historyCommand(message, transaction);
            break;
        case clearTrackingCommandRegex.test(commandPart):
            await clearTrackingCommand(message, transaction);
            break;
        case buyTrackingCommandRegex.test(commandPart):
            await trackCommand(message, 'buy', transaction);
            break;
    }
}

export function handleError(message: Message, caughtError: Error) {
    Sentry.addBreadcrumb({
        category: 'command',
        message: message.content,
    });
    Sentry.captureException(caughtError);
    message.sendError(caughtError).then();
}
