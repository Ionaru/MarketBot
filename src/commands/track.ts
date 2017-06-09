import * as countdown from 'countdown';
import * as sqlite3 from 'sqlite3';
import { logger } from '../helpers/program-logger';
import { client, items } from '../market-bot';
import { regionList } from '../regions';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { getCheapestOrder } from '../helpers/api';
import { MarketData, SDEObject } from '../typings';
import { formatNumber, pluralize } from '../helpers/formatters';
import { Message } from '../chat-service/discord-interface';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { logCommand } from '../helpers/command-logger';
import SequelizeStatic = require('sequelize');
import Instance = SequelizeStatic.Instance;
import Model = SequelizeStatic.Model;

export let TrackingEntry;

export interface TrackingEntryAttr {
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
  current_order?: MarketData;
}

/* tslint:disable:no-empty-interface */
export interface TrackingEntryInstance extends Instance<TrackingEntryAttr>, TrackingEntryAttr { }
/* tslint:enable:no-unused-variable */

export async function initTracking() {
  const db = new sqlite3.Database('botlog.db').close();

  const sequelizeDatabase = new SequelizeStatic('sqlite://tracking.db', {
    dialect: 'sqlite',
    logging: function (str) {
      logger.debug(str);
    }
  });

  sequelizeDatabase
    .authenticate()
    .then(function () {
      logger.info('Connection to tracking database has been established successfully');
    }, function (err) {
      logger.error('Unable to connect to the database:', err);
    });

  TrackingEntry = await sequelizeDatabase.define('TrackingEntry', {
    item_id: SequelizeStatic.INTEGER,
    region_id: SequelizeStatic.INTEGER,
    message_data: SequelizeStatic.TEXT,
    channel_id: SequelizeStatic.STRING,
    sender_id: SequelizeStatic.STRING,
    tracking_type: SequelizeStatic.STRING,
    tracking_limit: SequelizeStatic.DECIMAL,
    tracking_price: SequelizeStatic.DECIMAL,
    tracking_start: SequelizeStatic.INTEGER,
    tracking_duration: SequelizeStatic.INTEGER,
    current_price: SequelizeStatic.DECIMAL,
  }).sync();
}

export async function startTrackingCycle() {
  await performTrackingCycle();
  setInterval(async () => {
    await performTrackingCycle();
  }, 300 * 1000);
}

export async function trackFunction(message: Message, type: 'buy' | 'sell') {

  const maxEntries = 3;
  const timeLimit = 60 * 60 * 1000;

  const replyPlaceHolder = await message.reply(
    `Setting up for price tracking. One moment please, ${message.sender}...`
  );

  if (!(message.isPrivate)) {
    const reply = 'Please send me a private message to have me track an item price for you.';
    await replyPlaceHolder.edit(reply);
    return;
  }

  const messageIdentifier = message.channel.id + message.id;

  const messageData = parseMessage(message.content);

  let itemData: SDEObject;
  let regionName;

  if (!(messageData.item && messageData.item.length)) {
    const reply = 'You need to give me an item to track.';
    await replyPlaceHolder.edit(reply);
    return;
  }

  let reply = '';

  itemData = items.filter(_ => {
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
    const reply1 = `I don't know what you mean with "${messageData.item}" 😟`;
    await replyPlaceHolder.edit(reply1);
    return;
  }

  let regionId = 10000002;

  if (messageData.region) {
    regionId = guessUserRegionInput(messageData.region);
    if (!regionId) {
      reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat('The Force')}`;
      reply += newLine(2);
      regionId = 10000002;
    }
  }

  regionName = regionList[regionId];

  let changeLimit = messageData.limit || 1;

  if (changeLimit < 0.01) {
    reply += makeCode('0.01 ISK') + ' is the minimum change amount I can handle.';
    reply += newLine();
    changeLimit = 0.01;
  }

  const x: Array<TrackingEntryInstance> = await TrackingEntry.findAll();
  const dupEntries = x.filter(_ => {
    return _.sender_id === message.author.id;
  });
  if (dupEntries.length + 1 > maxEntries) {
    const reply1 = `You've reached the maximum of ${makeBold(maxEntries)} tracking entries.`;
    await replyPlaceHolder.edit(reply1);
    return;
  }

  const itemDup = dupEntries.filter(_ => {
    if (_.item_id === itemData.itemID && _.region_id === regionId && _.tracking_type === type) {
      return true;
    }
  });
  if (itemDup.length !== 0) {
    const reply1 = `I am already tracking ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)} for you.`;
    await replyPlaceHolder.edit(reply1);
    return;
  }

  const originalOrder = await getCheapestOrder(type, itemData.itemID, regionId);

  if (!originalOrder) {
    const reply1 = `I couldn't find any ${makeBold(type)} orders for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}.`;
    await replyPlaceHolder.edit(reply1);
    return;
  }

  const originalPrice = originalOrder.price;

  reply += `Started ${makeBold(type)} price tracking for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}, ` +
    `I'll warn you when the ${makeBold(type)} price changes ${makeCode(formatNumber(changeLimit) + ' ISK')}. ` +
    ` Right now the price is ${makeCode(formatNumber(originalPrice) + ' ISK')}`;
  reply += newLine(2);
  reply += `Tracking will last ${makeCode(countdown(Date.now() + timeLimit))}`;

  const trackingEntry: TrackingEntryAttr = {
    item_id: itemData.itemID,
    region_id: regionId,
    message_data: messageIdentifier,
    channel_id: message.channel.id,
    sender_id: message.author.id,
    tracking_type: type,
    tracking_limit: changeLimit,
    tracking_price: originalPrice,
    tracking_start: Date.now(),
    tracking_duration: timeLimit,
    current_price: originalPrice,
  };

  await TrackingEntry.create(trackingEntry);
  await replyPlaceHolder.edit(reply);

  logCommand('track', message, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
}

function droppedRose(amount) {
  if (amount < 0) {
    return 'dropped';
  }
  return 'rose';
}

/*
 * The main tracking cycle, it will fetch prices for all items in the TrackingEntries array and send messages
 * */
async function performTrackingCycle() {

  const trackingEntries: Array<TrackingEntryInstance> = await TrackingEntry.findAll();

  const entriesDone: Array<TrackingEntryInstance> = [];

  for (const entry of trackingEntries) {

    // Remove tracking entry when the time since tracking start exceeds the max duration
    if (Date.now() - entry.tracking_start > entry.tracking_duration) {
      sendExpiredMessage(entry.channel_id, entry);
      entry.destroy().then();
      break;
    }

    let currentPrice: number;
    let currentOrder: MarketData;

    // It is inefficient to fetch prices for the same item/region combo twice, check if the combo exists in duplicateEntries
    const duplicateEntry = entriesDone.filter(_ => {
        return _.item_id === entry.item_id && _.region_id === entry.region_id && _.current_price;
      }
    )[0];

    if (duplicateEntry && duplicateEntry.current_order) {
      currentOrder = duplicateEntry.current_order;
    } else {
      currentOrder = await getCheapestOrder(entry.tracking_type, entry.item_id, entry.region_id).catch(() => {
        return null;
      });
      if (currentOrder) {
        currentPrice = currentOrder.price;
      }
    }

    // Only run if we have a currentPrice and if it is different from the tracking price
    if (currentPrice && currentPrice !== entry.tracking_price) {

      // Calculate the difference between the two values and get the absolute number from it
      const change = currentPrice - entry.tracking_price;
      const changeAbsolute = Math.abs(change);

      // Round the difference to 2 decimals
      const roundedChange = +(Math.round(Number(changeAbsolute.toString() + 'e+' + '2')) + 'e-' + 2);

      if (roundedChange >= entry.tracking_limit) {
        await sendChangeMessage(entry.channel_id, currentOrder, entry, changeAbsolute).then(() => {
          // Update the tracking_price so we don't notify twice for the same price change
          entry.tracking_price = currentOrder.price;
          entry.current_price = currentOrder.price;
          entry.save().then();
        }).catch((error) => {
          console.warn('Cannot send message', error);
          entry.destroy().then();
        });
      }
    }
    entry.current_order = currentOrder;
    entriesDone.push(entry);
  }
}

async function sendChangeMessage(channelId: string, currentOrder: MarketData, entry: TrackingEntryAttr, change: number) {
  const oldPrice = formatNumber(entry.tracking_price) + ' ISK';
  const newPrice = formatNumber(currentOrder.price) + ' ISK';
  const isWord = pluralize('is', 'are', currentOrder.volume_remain);
  const itemWord = pluralize('item', 'items', currentOrder.volume_remain);
  const droppedRoseWord = droppedRose(currentOrder.price - entry.tracking_price);
  const changeText = makeCode(`${formatNumber(change)} ISK`);

  const itemName = items.filter(_ => _.itemID === entry.item_id)[0].name.en;
  const regionName = regionList[entry.region_id];

  let reply = `Attention, change detected in ${makeBold(entry.tracking_type)} price `;
  reply += `for ${itemFormat(itemName)} in ${regionFormat(regionName)}: `;
  reply += newLine();
  reply += `The ${makeBold(entry.tracking_type)} price for ${itemFormat(itemName)} ${droppedRoseWord} ${changeText}, `;
  reply += `from ${makeCode(oldPrice)} to ${makeCode(newPrice)}. `;
  reply += newLine();
  reply += `There ${isWord} ${makeCode(currentOrder.volume_remain.toString())} ${itemWord} set at this price.`;
  await client.sendToChannel(channelId, reply);
}

function sendExpiredMessage(channelId: string, entry: TrackingEntryAttr) {

  const itemName = items.filter(_ => _.itemID === entry.item_id)[0].name.en;
  const regionName = regionList[entry.region_id];

  let reply = `Tracking of the ${makeBold(entry.tracking_type)} price `;
  reply += `for ${itemFormat(itemName)} in ${regionFormat(regionName)} expired.`;
  client.sendToChannel(channelId, reply).catch(() => {});
}
