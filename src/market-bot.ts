import { logger } from 'winston-pnp-logger';

import { Client } from './chat-service/discord/client';
import { Message } from './chat-service/discord/message';
import { buyOrdersFunction } from './commands/buy-orders';
import { dataFunction } from './commands/data';
import { infoFunction } from './commands/info';
import { priceFunction } from './commands/price';
import { sellOrdersFunction } from './commands/sell-orders';
import { clearTracking, initTracking, startTrackingCycle, trackFunction } from './commands/track';
import { fetchCitadelData } from './helpers/api';
import { startLogger } from './helpers/command-logger';
import { loadItems } from './helpers/items-loader';
import { readToken, readTypeIDs } from './helpers/readers';
import { createCommandRegex } from './helpers/regex';
import { ICitadelData } from './typings';

export const creator = {name: 'Ionaru', id: '96746840958959616'};

export let client: Client | undefined;
export let token: string;

export let citadels: ICitadelData;

export const tokenPath = 'config/token.txt';
export const typeIDsPath = 'data/typeIDs.yaml';

export const commandPrefix = '/';

export const priceCommands = [
  'price', 'p', 'value'
];
export const dataCommands = [
  'data', 'd'
];
export const sellOrdersCommands = [
  'sell-orders', 'sell', 'so', 's'
];
export const buyOrdersCommands = [
  'buy-orders', 'buy', 'bo', 'b'
];
export const infoCommands = [
  'info', 'i', 'about', 'help'
];
export const regionCommands = [
  'region', 'r'
];
export const limitCommands = [
  'limit', 'l', 'max'
];
export const sellTrackingCommands = [
  'track-sell-orders', 'tso'
];
export const buyTrackingCommands = [
  'track-buy-orders', 'tbo'
];
export const clearTrackingCommands = [
  'track-clear', 'tc'
];

export const priceCommandRegex = createCommandRegex(priceCommands, true);
export const dataCommandRegex = createCommandRegex(dataCommands, true);
export const sellOrdersCommandRegex = createCommandRegex(sellOrdersCommands, true);
export const buyOrdersCommandRegex = createCommandRegex(buyOrdersCommands, true);
export const infoCommandRegex = createCommandRegex(infoCommands, true);
export const sellTrackingCommandRegex = createCommandRegex(sellTrackingCommands, true);
export const buyTrackingCommandRegex = createCommandRegex(buyTrackingCommands, true);
export const clearTrackingCommandRegex = createCommandRegex(clearTrackingCommands, true);
export const regionCommandRegex = createCommandRegex(regionCommands);
export const limitCommandRegex = createCommandRegex(limitCommands);

export async function activate() {
  logger.info('Bot has awoken, loading items');
  loadItems(readTypeIDs(typeIDsPath));

  logger.info(`Fetching known citadels from stop.hammerti.me API`);

  citadels = await fetchCitadelData().catch((error) => {
    logger.error(error);
    return {};
  });

  // Schedule a refresh of the citadel list every 6 hours
  setInterval(async () => {
    const newCitadels = await fetchCitadelData().catch(() => {
      return {};
    });
    if (Object.keys(newCitadels).length && newCitadels.toString() !== citadels.toString()) {
      citadels = newCitadels;
      logger.info('Citadel data updated');
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  logger.info(`${Object.keys(citadels).length} citadels loaded into memory`);

  token = readToken(tokenPath);

  await startLogger();

  await initTracking();

  client = new Client(token);

  client.login();
  client.emitter.once('ready', () => {
    announceReady();
  });
}

function announceReady() {
  startTrackingCycle().then();

  if (client) {
    client.emitter.on('message', (message: Message) => {
      processMessage(message).then().catch((error: Error) => {
        handleError(message, error);
      });
    });
    logger.info(`I am ${client.name}, now online!`);
  }
}

export async function deactivate(exitProcess: boolean, error = false): Promise<void> {
  let quitMessage = 'Quitting';
  if (error) {
    quitMessage += ' because of an uncaught error!';
  }

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

async function processMessage(message: Message): Promise<void> {
  switch (true) {
    case dataCommandRegex.test(message.content):
      await dataFunction(message);
      break;
    case sellOrdersCommandRegex.test(message.content):
      await sellOrdersFunction(message);
      break;
    case buyOrdersCommandRegex.test(message.content):
      await buyOrdersFunction(message);
      break;
    case infoCommandRegex.test(message.content):
      await infoFunction(message);
      break;
    case sellTrackingCommandRegex.test(message.content):
      await trackFunction(message, 'sell');
      break;
    case buyTrackingCommandRegex.test(message.content):
      await trackFunction(message, 'buy');
      break;
    case clearTrackingCommandRegex.test(message.content):
      await clearTracking(message);
      break;
    case priceCommandRegex.test(message.content):
      await priceFunction(message);
      break;
  }
}

export function handleError(message: Message, caughtError: Error) {
  message.sendError(caughtError).then();
}
