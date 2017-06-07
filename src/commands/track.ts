import * as sqlite3 from 'sqlite3';
import { logger } from '../helpers/program-logger';
import { client, items } from '../market-bot';
import { regionList } from '../regions';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { MarketData, SDEObject } from '../typings';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatNumber, pluralize } from '../helpers/formatters';
import { Message } from '../chat-service/discord-interface';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { logCommand } from '../helpers/command-logger';
import SequelizeStatic = require('sequelize');
import Instance = SequelizeStatic.Instance;
import Model = SequelizeStatic.Model;

export let TrackingEntry;

const maxEntries = 3;
const timeLimit = 60 * 60 * 1000;

export interface TrackingEntryAttr {
  item_id: number;
  region_id: number;
  message_data: string;
  channel_id: string;
  sender_id: string;
  tracking_limit: number;
  tracking_price: number;
  tracking_start: number;
  tracking_duration: number;
  current_price: number;
}

/* tslint:disable:no-empty-interface */
export interface TrackingEntryInstance extends Instance<TrackingEntryAttr>, TrackingEntryAttr { }
export interface TrackingEntryModel extends Model<TrackingEntryAttr, TrackingEntryAttr> { }
/* tslint:enable:no-unused-variable */

export async function initTracking() {
  const db = new sqlite3.Database('botlog.db').close();

  const sequelizeDatabase = new SequelizeStatic('sqlite://tracking.db', {
    dialect: 'sqlite',
    logging: logger.debug
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

export async function trackFunction(message: Message) {
  const replyPlaceHolder = await message.reply(
    `Setting up for price tracking. One moment please, ${message.sender}...`
  );

  let reply = '';

  if (!(message.isPrivate)) {
    const reply1 = 'Please send me a private message to have me track an item price for you.';
    await replyPlaceHolder.edit(reply1);
    return;
  }

  const messageIdentifier = message.channel.id + message.id;

  const messageData = parseMessage(message.content);

  let itemData: SDEObject;
  let regionName;

  if (!(messageData.item && messageData.item.length)) {
    const reply1 = 'You need to give me an item to track.';
    await replyPlaceHolder.edit(reply1);
    return;
  }

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
  console.log(x.length);
  const dupEntries = x.filter(_ => {
    return _.sender_id === message.author.id;
  });
  console.log(dupEntries.length);
  if (dupEntries.length + 1 > maxEntries) {
    const reply1 = `You've reached the maximum of ${makeBold(maxEntries)} tracking entries.`;
    await replyPlaceHolder.edit(reply1);
    return;
  }

  const itemDup = dupEntries.filter(_ => {
    if (_.item_id === itemData.itemID && _.region_id === regionId) {
      return true;
    }
  });
  if (itemDup.length !== 0) {
    const reply1 = `I am already tracking ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)} for you.`;
    await replyPlaceHolder.edit(reply1);
    return;
  }

  const originalOrder = await getCheapestOrder(itemData.itemID, regionId);

  if (!originalOrder) {
    const reply1 = `I couldn't find any sell orders for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}.`;
    await replyPlaceHolder.edit(reply1);
    return;
  }

  const originalPrice = originalOrder.price;

  reply += `Started price tracking for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}, ` +
    `I'll warn you when the price changes ${makeCode(formatNumber(changeLimit) + ' ISK')}. ` +
    ` Right now the price is ${makeCode(formatNumber(originalPrice) + ' ISK')}`;

  const trackingEntry: TrackingEntryAttr = {
    item_id: itemData.itemID,
    region_id: regionId,
    message_data: messageIdentifier,
    channel_id: message.channel.id,
    sender_id: message.author.id,
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

async function getCheapestOrder(itemId: number, regionId: number): Promise<MarketData> {
  const marketData = await fetchMarketData(itemId, regionId);
  if (marketData) {
    const sellOrders = marketData.filter(_ => _.is_buy_order === false);
    if (sellOrders && sellOrders.length) {
      const sortedSellOrders: Array<MarketData> = sortArrayByObjectProperty(sellOrders, 'price');
      return sortedSellOrders[0];
    }
  }
  return null;
}

/*
 * The main tracking cycle, it will fetch prices for all items in the TrackingEntries array
 * */
async function performTrackingCycle() {

  const trackingEntries: Array<TrackingEntryInstance> = await TrackingEntry.findAll();

  const entriesDone: Array<TrackingEntryInstance> = [];
  // const trackingCycleEntries = trackingEntries;

  for (const entry of trackingEntries) {

    console.log('Now', Date.now());
    console.log('entry.tracking_start', entry.tracking_start);
    console.log('Date.now() - entry.tracking_start', Date.now() - entry.tracking_start);
    console.log('entry.tracking_duration', entry.tracking_duration);
    if (Date.now() - entry.tracking_start < entry.tracking_duration) {
      const duplicateEntries = entriesDone.filter(_ => {
          return _.item_id === entry.item_id && _.region_id === entry.region_id && _.current_price;
        }
      )[0];

      let currentPrice: number;
      let currentOrder: MarketData;
      if (duplicateEntries) {
        currentPrice = duplicateEntries.current_price;
      } else {
        currentOrder = await getCheapestOrder(entry.item_id, entry.region_id).catch(() => {
          return null;
        });
        if (currentOrder) {
          currentPrice = currentOrder.price;
        }
      }

      console.log('currentPrice', currentPrice);
      console.log('tracking_price', entry.tracking_price);

      if (currentPrice && currentPrice !== entry.tracking_price) {
        console.log('rawChange', currentPrice - entry.tracking_price);
        const change = currentPrice - entry.tracking_price
        console.log('change', change);
        const changeAbsolute = Math.abs(change);
        console.log('changeAbsolute', changeAbsolute);
        const readableChange = +(Math.round(Number(changeAbsolute.toString() + 'e+' + '2')) + 'e-' + 2);
        console.log('readableChange', readableChange);
        if (readableChange >= entry.tracking_limit) {
          console.log('sending message', entry.channel_id, currentOrder.order_id, entry.current_price, changeAbsolute);
          await sendChangeMessage(entry.channel_id, currentOrder, entry, changeAbsolute).then(() => {
            entry.tracking_price = currentOrder.price;
            entry.current_price = currentOrder.price;
            entry.save().then();
          }).catch((e) => {
            console.warn('Cannot send message', e);
            entry.destroy().then();
          });
        }
      }
    } else {
      await client.sendToChannel(entry.channel_id, 'Tracking duration expired.').catch(() => {});
      entry.destroy().then();
    }
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

  let tReply = `Attention, price change detected for ${itemFormat(itemName)} in ${regionFormat(regionName)}: `;
  tReply += newLine();
  tReply += `The price for ${itemFormat(itemName)} ${droppedRoseWord} ${changeText}, `;
  tReply += `from ${makeCode(oldPrice)} to ${makeCode(newPrice)}. `;
  tReply += newLine();
  tReply += `There ${isWord} ${makeCode(currentOrder.volume_remain.toString())} ${itemWord} available for this price.`;
  console.log('SEND', itemName, regionName, changeText);
  await client.sendToChannel(channelId, tReply);
}
