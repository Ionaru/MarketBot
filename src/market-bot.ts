import * as Discord from 'discord.js';
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
import path = require('path');
import Fuse = require('fuse.js');
import programLogger = require('./helpers/program-logger');
import { dataFunction } from './commands/data';

export const creator = {name: 'Ionaru', id: '96746840958959616'};
export const playing = {game: {name: 'with ISK (/i for info)'}};

export const universeApi = new UniverseApi();
export let items: Array<SDEObject>;

export let client: Discord.Client;
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

export const priceCommandRegex = createCommandRegex(priceCommands, true);
export const dataCommandRegex = createCommandRegex(dataCommands, true);
export const sellOrdersCommandRegex = createCommandRegex(sellOrdersCommands, true);
export const buyOrdersCommandRegex = createCommandRegex(buyOrdersCommands, true);
export const infoCommandRegex = createCommandRegex(infoCommands, true);
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
  }, 6 * 60 * 60 * 1000); // 6 hours

  logger.info(`${Object.keys(citadels).length} citadels loaded into memory`);

  token = readToken(tokenPath);

  await startLogger();

  client = new Discord.Client();
  client.login(token);
  client.once('ready', () => {
    announceReady();
  });
}

function announceReady() {
  client.user.setPresence(playing).then();
  client.on('message', (message: Discord.Message) => {
    processMessage(message).then().catch((error: Error) => {
      handleError(message, error);
    });
  });
  logger.info(`I am ${client.user.username}, now online!`);

  client.on('warn', (warning: string) => {
    logger.warn(warning);
  });
  client.on('error', (error: Error) => {
    logger.error(error);
  });
}

async function deactivate() {
  logger.info('Quitting!');
  if (client) {
    await client.destroy();
  }
  logger.info('Done!');
  process.exit(0);
}

async function processMessage(discordMessage: Discord.Message) {
  if (discordMessage.content.match(priceCommandRegex)) {
    await priceFunction(discordMessage);
  } else if (discordMessage.content.match(dataCommandRegex)) {
    await dataFunction(discordMessage);
  } else if (discordMessage.content.match(sellOrdersCommandRegex)) {
    await sellOrdersFunction(discordMessage);
  } else if (discordMessage.content.match(buyOrdersCommandRegex)) {
    await buyOrdersFunction(discordMessage);
  } else if (discordMessage.content.match(infoCommandRegex)) {
    await infoFunction(discordMessage);
  }
}

export function handleError(message: Discord.Message, caughtError: Error) {
  const time = Date.now();
  logger.error(`Caught error @ ${time}\n`, caughtError);
  logger.error(`Original message:`, message.content);
  message.channel.sendMessage(
    `**ERROR** Something went wrong, please consult <@${creator.id}> (<https://discord.gg/k9tAX94>)\n\n` +
    `Error message: \`${caughtError.message} @ ${time}\``
  ).then().catch((error: Response) => {
    logger.error(`Unable to send error message to channel '${message.channel}'!`);
    logger.error(error);
  });
}

activate().then();
process.stdin.resume();
process.on('unhandledRejection', function (reason: string, p: Promise<any>): void {
  logger.error('Unhandled Rejection at: Promise', p, '\nreason:', reason);
});
process.on('uncaughtException', function (error) {
  logger.error(error);
  deactivate().then();
});
process.on('SIGINT', () => {
  deactivate().then();
});
