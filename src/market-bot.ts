import { UniverseApi } from '../swagger/api';
import { CitadelData, SDEObject } from './typings';
import { infoFunction } from './commands/info';
import { sellOrdersFunction } from './commands/sell-orders';
import { priceFunction } from './commands/price';
import { readToken, readTypeIDs } from './helpers/readers';
import { parseTypeIDs } from './helpers/parsers';
import { startLogger } from './helpers/command-logger';
import { Logger, logger } from './helpers/program-logger';
import { createCommandRegex } from './helpers/regex';
import { buyOrdersFunction } from './commands/buy-orders';
import { fetchCitadelData } from './helpers/api';
import { dataFunction } from './commands/data';
import { Client, Message } from './chat-service/discord-interface';
import path = require('path');
import Fuse = require('fuse.js');
import programLogger = require('./helpers/program-logger');
import { trackFunction } from './commands/trace';

export const creator = {name: 'Ionaru', id: '96746840958959616'};

export const universeApi = new UniverseApi();
export let items: Array<SDEObject>;

export let client: Client;
export let fuse: Fuse;
export let token: string;

export let citadels: CitadelData;

const tokenPath = path.join(__dirname, '../config/token.txt');
const typeIDsPath = path.join(__dirname, '../data/typeIDs.yaml');

export const commandPrefix = '/';

export const priceCommands = [
  'price', 'p', 'value',
];
export const dataCommands = [
  'data', 'd'
];
export const sellOrdersCommands = [
  'sell', 's', 'cheap', 'c'
];
export const buyOrdersCommands = [
  'buy', 'b'
];
export const infoCommands = [
  'info', 'i', 'about', 'help'
];
export const regionCommands = [
  'region', 'r'
];
export const limitCommands = [
  'limit', 'l', 'max',
];
export const trackCommands = [
  'trace', 't', 'track'
];

export const priceCommandRegex = createCommandRegex(priceCommands, true);
export const dataCommandRegex = createCommandRegex(dataCommands, true);
export const sellOrdersCommandRegex = createCommandRegex(sellOrdersCommands, true);
export const buyOrdersCommandRegex = createCommandRegex(buyOrdersCommands, true);
export const infoCommandRegex = createCommandRegex(infoCommands, true);
export const trackCommandRegex = createCommandRegex(trackCommands, true);
export const regionCommandRegex = createCommandRegex(regionCommands);
export const limitCommandRegex = createCommandRegex(limitCommands);

async function activate() {
  programLogger.logger = new Logger();

  logger.info('Bot has awoken, loading typeIDs.yaml');
  const typeIDs = readTypeIDs(typeIDsPath);
  logger.info('File loaded, starting parse cycle');
  items = parseTypeIDs(typeIDs);

  fuse = new Fuse(items, {
    shouldSort: true,
    threshold: 0.6,
    location: 0,
    distance: 100,
    maxPatternLength: 128,
    tokenize: true,
    minMatchCharLength: 1,
    keys: ['name.en']
  });

  logger.info(`Parsing complete, ${items.length} items loaded into memory`);

  logger.info(`Fetching known citadels from stop.hammerti.me API`);

  citadels = await fetchCitadelData();

  // Schedule a refresh of the citadel list every 6 hours
  setInterval(async () => {
    const newCitadels = await fetchCitadelData();
    if (citadels.toString() !== newCitadels.toString()) {
      citadels = newCitadels;
      logger.info('Citadel data updated');
    }
  }, 30000); // 6 hours

  logger.info(`${Object.keys(citadels).length} citadels loaded into memory`);

  token = readToken(tokenPath);

  await startLogger();

  client = new Client(token);

  client.login();
  client.emitter.once('ready', () => {
    announceReady();
  });
}

function announceReady() {
  client.emitter.on('message', (message: Message) => {
    processMessage(message).then().catch((error: Error) => {
      handleError(message, error);
    });
  });
  logger.info(`I am ${client.name}, now online!`);
}

async function deactivate(exitProcess: boolean) {
  logger.info('Quitting!');
  if (client) {
    await client.disconnect();
    client = null;
    logger.info('Client destroyed');
  }
  logger.info('Done!');
  if (exitProcess) {
    process.exit(0);
  }
}

async function processMessage(message: Message) {
  if (message.content.match(priceCommandRegex)) {
    await priceFunction(message);
  } else if (message.content.match(dataCommandRegex)) {
    await dataFunction(message);
  } else if (message.content.match(sellOrdersCommandRegex)) {
    await sellOrdersFunction(message);
  } else if (message.content.match(buyOrdersCommandRegex)) {
    await buyOrdersFunction(message);
  } else if (message.content.match(infoCommandRegex)) {
    await infoFunction(message);
  } else if (message.content.match(trackCommandRegex)) {
    await trackFunction(message);
  }
}

function handleError(message: Message, caughtError: Error) {
  message.sendError(caughtError).then();
}

activate().then();
process.stdin.resume();
process.on('unhandledRejection', function (reason: string, p: Promise<any>): void {
  logger.error('Unhandled Rejection at: Promise', p, '\nreason:', reason);
});
process.on('uncaughtException', function (error) {
  logger.error(error);
  deactivate(true).then();
});
process.on('SIGINT', () => {
  deactivate(true).then();
});
