import * as Sentry from '@sentry/node';
import * as elastic from 'elastic-apm-node';
import { createConnection } from 'typeorm';
import { logger } from 'winston-pnp-logger';

import { Command } from './chat-service/command';
import { DataCommand } from './chat-service/data-command';
import { Client } from './chat-service/discord/client';
import { Message } from './chat-service/discord/message';
import { PriceCommand } from './chat-service/price-command';
import { buyOrdersCommand } from './commands/buy-orders';
import { historyCommand } from './commands/history';
import { infoCommand } from './commands/info';
import { itemCommand } from './commands/item';
import { sellOrdersCommand } from './commands/sell-orders';
import { clearTrackingCommand, performTrackingCycle, startTrackingCycle, trackCommand, TrackingEntry } from './commands/track';
import { checkAndUpdateCache, checkAndUpdateCitadelCache } from './helpers/cache';
import { LogEntry } from './helpers/command-logger';
import { readVersion } from './helpers/readers';
import { createCommandRegex } from './helpers/regex';
import { configuration, debug, esiCache } from './index';

export const creator = 'Ionaru#3801';
export let version: string;
export const botName = 'MarketBot';

export let client: Client | undefined;

export const dataFolder = 'data';

export const commandPrefix = '/';

export const historyCommands = [
    'history', 'h',
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

export const itemCommandRegex = createCommandRegex(itemCommands, true);
export const historyCommandRegex = createCommandRegex(historyCommands, true);
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
    debug('Starting bot activation');

    version = readVersion();

    debug(`Bot version: ${version}`);

    esiCache.readCache();

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

    debug(`Database connection created`);

    const token = configuration.getProperty('discord.token');
    if (token && typeof token === 'string') {
        client = new Client(token);

        debug(`Logging in...`);
        client.login();
        client.emitter.once('ready', () => {
            if (client) {
                debug(`Logged in as ${client.name}`);
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

            if (!Command.test(message.content)) {
                return;
            }

            let transaction: any;
            if (configuration.getProperty('elastic.enabled') === true) {
                transaction = elastic.startTransaction();
            }
            processMessage(message, transaction).then().catch((error: Error) => {
                handleError(message, error);
            });

        });
        debug(`Activation complete, ready for messages!`);
    }
}

export async function deactivate(exitProcess: boolean, error = false): Promise<void> {
    let quitMessage = 'Quitting';
    if (error) {
        quitMessage += ' because of an uncaught error!';
    }

    esiCache.dumpCache();

    debug(quitMessage);
    if (client) {
        await client.disconnect();
        client = undefined;
        debug('Client destroyed');
    }

    debug('Done!');

    if (exitProcess) {
        process.exit(0);
    }
}

async function processMessage(message: Message, transaction: any): Promise<void> {
    const rootCommand = message.content.split(' ')[0];
    switch (true) {
        case PriceCommand.test(rootCommand):
            new PriceCommand(message).execute().then();
            break;
        case sellOrdersCommandRegex.test(rootCommand):
            await sellOrdersCommand(message, transaction);
            break;
        case infoCommandRegex.test(rootCommand):
            await infoCommand(message, transaction);
            break;
        case buyOrdersCommandRegex.test(rootCommand):
            await buyOrdersCommand(message, transaction);
            break;
        case DataCommand.test(rootCommand):
            new DataCommand(message).execute().then();
            break;
        case sellTrackingCommandRegex.test(rootCommand):
            await trackCommand(message, 'sell', transaction);
            break;
        case itemCommandRegex.test(rootCommand):
            await itemCommand(message, transaction);
            break;
        case historyCommandRegex.test(rootCommand):
            await historyCommand(message, transaction);
            break;
        case clearTrackingCommandRegex.test(rootCommand):
            await clearTrackingCommand(message, transaction);
            break;
        case buyTrackingCommandRegex.test(rootCommand):
            await trackCommand(message, 'buy', transaction);
            break;
    }
}

export function handleError(message: Message, caughtError: Error) {
    Sentry.setContext('command', {command: message.content});
    Sentry.captureException(caughtError);
    message.sendError(caughtError).then();
}
