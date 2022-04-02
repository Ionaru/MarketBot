import Bugsnag from '@bugsnag/js';
import { createConnection } from 'typeorm';

import { version } from '../package.json';

import { Command } from './chat-service/command';
import { Client } from './chat-service/discord/client';
import { Message } from './chat-service/discord/message';
import { InfoCommand } from './chat-service/info-command';
import { BuyOrdersCommand } from './commands/buy-orders';
import { DataCommand } from './commands/data';
import { HistoryCommand } from './commands/history';
import { ItemCommand } from './commands/item';
import { PriceCommand } from './commands/price';
import { SellOrdersCommand } from './commands/sell-orders';
import { ClearTrackingCommand, performTrackingCycle, startTrackingCycle, TrackCommand, TrackingEntry } from './commands/track';
import { TrackListCommand } from './commands/track-list';
import { SlashCreatorController } from './controllers/slash-creator.controller';
import { debug } from './debug';
import { checkAndUpdateCache, checkAndUpdateCitadelCache } from './helpers/cache';
import { LogEntry } from './helpers/command-logger';
import { createCommandRegex } from './helpers/regex';

import { configuration, esiCache } from './index';

export const creator = 'Ionaru#3801';
export const botName = 'MarketBot';

export let client: Client | undefined;

export const dataFolder = 'data';

export const commandPrefix = '/';

export const regionCommands = [
    'region', 'r',
];
export const systemCommands = [
    'system',
];
export const limitCommands = [
    'limit', 'l', 'max',
];

export const regionCommandRegex = createCommandRegex(regionCommands);
export const systemCommandRegex = createCommandRegex(systemCommands);
export const limitCommandRegex = createCommandRegex(limitCommands);

export const activate = async () => {
    debug('Starting bot activation');

    debug(`Bot version: ${version}`);

    esiCache.readCache();

    await checkAndUpdateCache().catch((error: Error) => {
        process.stderr.write('Unable to create initial cache, bot cannot function!\n');
        throw error;
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

        const slashCreatorService = new SlashCreatorController().init(client);

        slashCreatorService.registerCommand((slashCreator) => new PriceCommand(slashCreator));
        slashCreatorService.registerCommand((slashCreator) => new ItemCommand(slashCreator));
        slashCreatorService.registerCommand((slashCreator) => new DataCommand(slashCreator));
        slashCreatorService.registerCommand((slashCreator) => new BuyOrdersCommand(slashCreator));
        slashCreatorService.registerCommand((slashCreator) => new SellOrdersCommand(slashCreator));
        slashCreatorService.registerCommand((slashCreator) => new HistoryCommand(slashCreator));
        slashCreatorService.registerCommand((slashCreator) => new TrackCommand(slashCreator, 'buy'));
        slashCreatorService.registerCommand((slashCreator) => new TrackCommand(slashCreator, 'sell'));
        slashCreatorService.registerCommand((slashCreator) => new TrackListCommand(slashCreator));
        slashCreatorService.registerCommand((slashCreator) => new ClearTrackingCommand(slashCreator));

        await slashCreatorService.syncCommands();

        debug(`Logging in...`);
        client.login();
        client.emitter.once('ready', () => {
            if (client) {
                debug(`Logged in as ${client.name}`);
                finishActivation();
            }
        });
    } else {
        throw new Error(`Discord bot token was not valid, expected a string but got '${token}' of type ${typeof token}`);
    }
};

const finishActivation = () => {
    performTrackingCycle().then(() => {
        startTrackingCycle();
    });

    if (client) {
        client.emitter.on('message', (message: Message) => {

            if (!Command.test(message.content)) {
                return;
            }

            processMessage(message).then().catch((error: Error) => {
                handleError(message, error);
            });

        });
        debug(`Activation complete, ready for messages!`);
    }
};

export const deactivate = async (exitProcess: boolean, error = false): Promise<void> => {
    let quitMessage = 'Quitting';
    if (error) {
        quitMessage += ' because of an uncaught error!';
    }

    esiCache.dumpCache();

    debug(quitMessage);
    if (client) {
        client.disconnect();
        client = undefined;
        debug('Client destroyed');
    }

    debug('Done!');

    if (exitProcess) {
        process.exit(0);
    }
};

const processMessage = async (message: Message): Promise<void> => {
    const rootCommand = message.content.split(' ')[0];
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (true) {
        case InfoCommand.test(rootCommand):
            new InfoCommand(message).execute().then();
            break;
    }
};

export const handleError = (message: Message, caughtError: Error) => {
    Bugsnag.addMetadata('command', { command: message.content });
    Bugsnag.notify(caughtError);
    message.sendError(caughtError).then();
};
