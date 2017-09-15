import * as countdown from 'countdown';
import SequelizeStatic = require('sequelize');
import { logger } from 'winston-pnp-logger';
import Instance = SequelizeStatic.Instance;

import { Message } from '../chat-service/discord/message';
import { getCheapestOrder } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber, pluralize } from '../helpers/formatters';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { items } from '../helpers/items-loader';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { client } from '../market-bot';
import { regionList } from '../regions';
import { IMarketData, ISDEObject } from '../typings';

export let trackingEntry: any;

export interface ITrackingEntryAttr {
  item_id: number;
  region_id: number;
  message_data: string;
  channel_id: string;
  sender_id: string;
  tracking_type: 'buy' | 'sell';
  tracking_limit: number;
  tracking_price: number;
  tracking_start: number;
  tracking_duration: number;
  current_price: number;
  current_order?: IMarketData;
}

/* tslint:disable:no-empty-interface */
export interface ITrackingEntryInstance extends Instance<ITrackingEntryAttr>, ITrackingEntryAttr {
}
/* tslint:enable:no-unused-variable */

interface ITrackCommandLogicReturn {
  reply: string;
  itemData: ISDEObject | undefined;
  regionName: string | undefined;
}

export async function initTracking() {
  // noinspection JSUnusedGlobalSymbols
  const sequelizeDatabase = new SequelizeStatic('sqlite://tracking.db', {
    dialect: 'sqlite',
    logging: (str: string) => {
      logger.debug(str);
    }
  });

  sequelizeDatabase
    .authenticate()
    .then(() => {
      logger.info('Connection to tracking database has been established successfully');
    }, (err) => {
      logger.error('Unable to connect to the database:', err);
    });

  trackingEntry = await sequelizeDatabase.define('TrackingEntry', {
    channel_id: SequelizeStatic.STRING,
    current_price: SequelizeStatic.DECIMAL,
    item_id: SequelizeStatic.INTEGER,
    message_data: SequelizeStatic.TEXT,
    region_id: SequelizeStatic.INTEGER,
    sender_id: SequelizeStatic.STRING,
    tracking_duration: SequelizeStatic.INTEGER,
    tracking_limit: SequelizeStatic.DECIMAL,
    tracking_price: SequelizeStatic.DECIMAL,
    tracking_start: SequelizeStatic.INTEGER,
    tracking_type: SequelizeStatic.STRING
  }).sync();
}

export async function startTrackingCycle() {
  await performTrackingCycle();
  setInterval(async () => {
    await performTrackingCycle();
  }, 5 * 60 * 1000);
}

export async function trackCommand(message: Message, type: 'buy' | 'sell'): Promise<void> {
  if (!(message.isPrivate)) {
    await message.reply('Please send me a private message to have me track an item price for you.');
    return;
  }

  const replyPlaceHolder = await message.reply(
    `Setting up for price tracking, one moment, ${message.sender}...`
  );

  const {reply, itemData, regionName} = await trackCommandLogic(message, type);

  await replyPlaceHolder.edit(reply);
  logCommand(`track-${type}-order`, message, (itemData ? itemData.name.en : undefined), (regionName ? regionName : undefined));
}

async function trackCommandLogic(message: Message, type: 'buy' | 'sell'): Promise<ITrackCommandLogicReturn> {
  const messageIdentifier = message.channel.id + message.id;

  const maxEntries = 3;
  const timeLimit = 6 * 60 * 60 * 1000;

  let itemData: ISDEObject;
  let regionName = '';
  let reply = '';

  const messageData = parseMessage(message.content);

  if (!(messageData.item && messageData.item.length)) {
    reply += 'You need to give me an item to track.';
    return {reply, itemData: undefined, regionName};
  }

  itemData = items.filter((_): boolean | void => {
    if (_.name.en) {
      return _.name.en.toUpperCase() === messageData.item.toUpperCase();
    }
  })[0];
  if (!itemData) {
    itemData = guessUserItemInput(messageData.item);
    if (itemData) {
      reply += `"${messageData.item}" didn't directly match any item I know of, my best guess is ${itemFormat(itemData.name.en)}`;
      reply += newLine(2);
    }
  }

  if (!itemData) {
    reply += `I don't know what you mean with "${messageData.item}" 😟`;
    return {reply, itemData: undefined, regionName};
  }

  let regionId: number | void = 10000002;

  if (messageData.region) {
    regionId = guessUserRegionInput(messageData.region);
    if (!regionId) {
      regionId = 10000002;
      reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(regionList[regionId])}`;
      reply += newLine(2);
    }
  }

  regionName = regionList[regionId];

  let changeLimit = messageData.limit || 1;

  if (changeLimit < 0.01) {
    reply += makeCode('0.01 ISK') + ' is the minimum change amount I can handle.';
    reply += newLine();
    changeLimit = 0.01;
  }

  const trackingEntries: ITrackingEntryInstance[] = await trackingEntry.findAll();
  const dupEntries = trackingEntries.filter((_) => _.sender_id === message.author.id);
  if (dupEntries.length + 1 > maxEntries) {
    reply += `You've reached the maximum of ${makeBold(maxEntries)} tracking entries.`;
    return {reply, itemData, regionName};
  }

  const itemDup = dupEntries.filter((_) =>
    (_.item_id === itemData.itemID && _.region_id === regionId && _.tracking_type === type)
  );
  if (itemDup.length !== 0) {
    reply += `I am already tracking ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)} for you.`;
    return {reply, itemData, regionName};
  }

  const originalOrder = await getCheapestOrder(type, itemData.itemID, regionId);

  if (!originalOrder) {
    reply += `I couldn't find any ${makeBold(type)} orders for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}.`;
    return {reply, itemData, regionName};
  }

  const originalPrice = originalOrder.price;

  reply += `Started ${makeBold(type)} price tracking for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}, ` +
    `I'll warn you when the ${makeBold(type)} price changes ${makeCode(formatNumber(changeLimit) + ' ISK')}. ` +
    ` Right now the price is ${makeCode(formatNumber(originalPrice) + ' ISK')}`;
  reply += newLine(2);
  const trackingTimeLimit = countdown(Date.now() + timeLimit) as countdown.Timespan;
  reply += `Tracking will last ${makeCode(trackingTimeLimit.toString())}`;

  const entry: ITrackingEntryAttr = {
    channel_id: message.channel.id,
    current_price: originalPrice,
    item_id: itemData.itemID,
    message_data: messageIdentifier,
    region_id: regionId,
    sender_id: message.author.id,
    tracking_duration: timeLimit,
    tracking_limit: changeLimit,
    tracking_price: originalPrice,
    tracking_start: Date.now(),
    tracking_type: type
  };

  await trackingEntry.create(entry);
  return {reply, itemData, regionName};
}

export async function clearTracking(message: Message) {
  const trackingEntries: ITrackingEntryInstance[] = await trackingEntry.findAll();
  if (trackingEntries && trackingEntries.length) {
    const personalEntries = trackingEntries.filter((_) => _.sender_id === message.author.id);
    for (const entry of personalEntries) {
      await entry.destroy();
    }
  }
  await message.reply(`Your tracking list is now empty, ${message.sender}.`);
  logCommand(`track-clear`, message, undefined, undefined);
}

function droppedRose(amount: number) {
  if (amount < 0) {
    return 'dropped';
  }
  return 'rose';
}

/**
 * The main tracking cycle, it will fetch prices for all items in the TrackingEntries array and send messages.
 */
async function performTrackingCycle() {

  const trackingEntries: ITrackingEntryInstance[] = await trackingEntry.findAll();

  const entriesDone: ITrackingEntryInstance[] = [];

  for (const entry of trackingEntries) {

    let currentPrice: number = 0;
    let currentOrder: IMarketData | undefined;

    // It is inefficient to fetch prices for the same item/region combo twice, check if the combo exists in duplicateEntries.
    const duplicateEntry = entriesDone.filter((_) =>
      (_.item_id === entry.item_id && _.region_id === entry.region_id && _.current_price)
    )[0];

    if (duplicateEntry && duplicateEntry.current_order) {
      currentOrder = duplicateEntry.current_order;
    } else {
      currentOrder = await getCheapestOrder(entry.tracking_type, entry.item_id, entry.region_id).catch(() => {
        return undefined;
      });
      if (currentOrder) {
        currentPrice = currentOrder.price;
      }
    }

    // Only run if we have a currentPrice and if it is different from the tracking price
    if (currentOrder && currentPrice && currentPrice !== entry.tracking_price) {

      // Calculate the difference between the two values and get the absolute number from it
      const change = currentPrice - entry.tracking_price;
      const changeAbsolute = Math.abs(change);

      // Round the difference to 2 decimals
      const roundedChange = +(Math.round(Number(changeAbsolute.toString() + 'e+' + '2')) + 'e-' + 2);

      if (roundedChange >= entry.tracking_limit) {
        await sendChangeMessage(entry.channel_id, currentOrder, entry, changeAbsolute).then(() => {
          // Update the tracking_price so we don't notify twice for the same price change
          if (entry && currentOrder) {
            entry.tracking_price = currentOrder.price;
            entry.current_price = currentOrder.price;
            entry.save().then();
          }
        }).catch((error) => {
          logger.error('Cannot send message', error);
          entry.destroy().then();
        });
      }
    }

    // Remove tracking entry when the time since tracking start exceeds the max duration
    if (Date.now() - entry.tracking_start > entry.tracking_duration) {
      sendExpiredMessage(entry.sender_id, entry.channel_id, entry).then();
      entry.destroy().then();
      continue;
    }

    entry.current_order = currentOrder;
    entriesDone.push(entry);
  }
}

async function sendChangeMessage(channelId: string, currentOrder: IMarketData, entry: ITrackingEntryAttr, change: number) {
  const oldPrice = formatNumber(entry.tracking_price) + ' ISK';
  const newPrice = formatNumber(currentOrder.price) + ' ISK';
  const isWord = pluralize('is', 'are', currentOrder.volume_remain);
  const itemWord = pluralize('item', 'items', currentOrder.volume_remain);
  const droppedRoseWord = droppedRose(currentOrder.price - entry.tracking_price);
  const changeText = makeCode(`${formatNumber(change)} ISK`);

  const itemName = items.filter((_) => _.itemID === entry.item_id)[0].name.en;
  const regionName = regionList[entry.region_id];

  let reply = `Attention, change detected in ${makeBold(entry.tracking_type)} price `;
  reply += `for ${itemFormat(itemName)} in ${regionFormat(regionName)}: `;
  reply += newLine();
  reply += `The ${makeBold(entry.tracking_type)} price for ${itemFormat(itemName)} ${droppedRoseWord} ${changeText}, `;
  reply += `from ${makeCode(oldPrice)} to ${makeCode(newPrice)}. `;
  reply += newLine();
  reply += `There ${isWord} ${makeCode(currentOrder.volume_remain.toString())} ${itemWord} set at this price.`;
  if (client) {
    await client.sendToChannel(channelId, reply);
  }
}

async function sendExpiredMessage(senderId: string, channelId: string, entry: ITrackingEntryAttr) {

  const itemName = items.filter((_) => _.itemID === entry.item_id)[0].name.en;
  const regionName = regionList[entry.region_id];

  let reply = `Tracking of the ${makeBold(entry.tracking_type)} price `;
  reply += `for ${itemFormat(itemName)} in ${regionFormat(regionName)} expired.`;
  if (client) {
    await client.sendToChannel(channelId, reply, senderId);
  }
}
