import Timer = NodeJS.Timer;
import { BaseEntity, Column, createConnection, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { logger } from 'winston-pnp-logger';

import { Message } from '../chat-service/discord/message';
import { getCheapestOrder } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber, pluralize } from '../helpers/formatters';
import { guessUserItemInput, guessUserRegionInput, IGuessReturn } from '../helpers/guessers';
import { items } from '../helpers/items-loader';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { client } from '../market-bot';
import { regionList } from '../regions';
import { IMarketData, ISDEObject } from '../typings';

// tslint:disable:variable-name
@Entity('TrackingEntries')
export class TrackingEntry extends BaseEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({type: 'integer'})
  public item_id: number;

  // noinspection TsLint
  @Column({type: 'varchar'})
  public channel_id: string;

  // noinspection TsLint
  @Column({type: 'varchar'})
  public sender_id: string;

  // noinspection TsLint
  @Column({type: 'integer'})
  public region_id: number;

  // noinspection TsLint
  @Column({type: 'decimal'})
  public tracking_limit: number;

  // noinspection TsLint
  @Column({type: 'decimal'})
  public tracking_price: number;

  // noinspection TsLint
  @Column({type: 'varchar'})
  public tracking_type: 'buy' | 'sell';
}
// tslint:enable:variable-name

let trackingCycle: Timer | undefined;

interface ITrackCommandLogicReturn {
  reply: string;
  itemData: ISDEObject | undefined;
  regionName: string | undefined;
}

export async function initTracking() {
  await createConnection({
    database: 'tracking.db',
    entities: [
      TrackingEntry
    ],
    synchronize: true,
    type: 'sqlite'
  });
}

export function startTrackingCycle() {
  trackingCycle = setInterval(() => {
    performTrackingCycle().then();
  }, 5 * 60 * 1000);
}

export function stopTrackingCycle() {
  if (trackingCycle !== undefined) {
    clearInterval(trackingCycle);
    trackingCycle = undefined;
  }
}

export async function trackCommand(message: Message, type: 'buy' | 'sell'): Promise<void> {
  const replyPlaceHolder = await message.reply(
    `Setting up for price tracking, one moment, ${message.sender}...`
  );

  const {reply, itemData, regionName} = await trackCommandLogic(message, type);

  await replyPlaceHolder.edit(reply);
  logCommand(`track-${type}-order`, message, (itemData ? itemData.name.en : undefined), (regionName ? regionName : undefined));
}

async function trackCommandLogic(message: Message, type: 'buy' | 'sell'): Promise<ITrackCommandLogicReturn> {
  const maxEntries = 3;

  let regionName = '';
  let reply = '';

  const messageData = parseMessage(message.content);

  if (!(messageData.item && messageData.item.length)) {
    reply += 'You need to give me an item to track.';
    return {reply, itemData: undefined, regionName};
  }

  const {itemData, guess}: IGuessReturn = guessUserItemInput(messageData.item);

  if (!itemData || !itemData.name.en) {
    reply += `I don't know what you mean with "${messageData.item}" 😟`;
    return {reply, itemData: undefined, regionName};
  }

  if (guess) {
    reply += `"${messageData.item}" didn't directly match any item I know of, my best guess is ${itemFormat(itemData.name.en)}`;
    reply += newLine(2);
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

  const trackingEntries: TrackingEntry[] = await TrackingEntry.find();
  const dupEntries = trackingEntries.filter((_) => _.sender_id === message.author.id);
  if (dupEntries.length + 1 > maxEntries) {
    reply += `You've reached the maximum of ${makeBold(maxEntries)} tracking entries.`;
    return {reply, itemData, regionName};
  }

  const channelItemDup = dupEntries.filter((_) =>
    (_.item_id === itemData.itemID && _.region_id === regionId && _.tracking_type === type && _.channel_id === message.channel.id)
  );
  if (channelItemDup.length !== 0) {
    reply += `I am already tracking the ${type} price for ${itemFormat(itemData.name.en)} in this channel.`;
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

  const entry = new TrackingEntry();
  entry.channel_id = message.channel.id;
  entry.item_id = itemData.itemID;
  entry.region_id = regionId;
  entry.sender_id = message.author.id;
  entry.tracking_limit = changeLimit;
  entry.tracking_price = originalPrice;
  entry.tracking_type =  type;
  await entry.save();

  if (trackingCycle === undefined) {
    startTrackingCycle();
  }
  return {reply, itemData, regionName};
}

export async function clearTracking(message: Message): Promise<void> {
  let reply = `All entries cleared from this channel, ${message.sender}.`;

  const messageData = parseMessage(message.content);
  let itemId: number | undefined;
  let itemData: IGuessReturn | undefined;
  if (messageData.item && messageData.item.length) {
    itemData = guessUserItemInput(messageData.item);
    if (itemData.itemData && itemData.itemData.name.en) {
      itemId = itemData.itemData.itemID;
    }
  }

  const trackingEntries: TrackingEntry[] = await TrackingEntry.find();
  if (trackingEntries && trackingEntries.length) {
    let entries = trackingEntries.filter((_) => _.channel_id === message.channel.id);
    if (itemId && itemData && itemData.itemData && itemData.itemData.name.en) {
      reply = `All entries for ${itemFormat(itemData.itemData.name.en)} cleared from this channel, ${message.sender}.`;
      entries = entries.filter((_) => _.item_id === itemId);
    }

    for (const entry of entries) {
      await entry.remove();
    }
  }
  await message.reply(reply);
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
export async function performTrackingCycle() {

  logger.debug('Executing tracking cycle');

  const trackingEntries: TrackingEntry[] = await TrackingEntry.find();

  if (!trackingEntries.length) {
    stopTrackingCycle();
    return;
  }

  const entriesDone: Array<{entry: TrackingEntry, order: IMarketData | undefined}> = [];

  for (const entry of trackingEntries) {

    let currentPrice: number = 0;
    let currentOrder: IMarketData | undefined;

    // It is inefficient to fetch prices for the same item/region combo twice, check if the combo exists in duplicateEntries.
    const duplicateEntry = entriesDone.filter((_) =>
      (_.entry.item_id === entry.item_id && _.entry.region_id === entry.region_id)
    )[0];

    currentOrder = (duplicateEntry && duplicateEntry.order) ?
      duplicateEntry.order : await getCheapestOrder(entry.tracking_type, entry.item_id, entry.region_id);

    if (currentOrder) {
      currentPrice = currentOrder.price;
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
            entry.save().then();
          }
        }).catch((error) => {
          logger.error('Cannot send message', error);
          entry.remove().then();
        });
      }
    }

    entriesDone.push({
      entry,
      order: currentOrder ? currentOrder : undefined
    });
  }
}

async function sendChangeMessage(channelId: string, currentOrder: IMarketData, entry: TrackingEntry, change: number) {
  const oldPrice = formatNumber(entry.tracking_price) + ' ISK';
  const newPrice = formatNumber(currentOrder.price) + ' ISK';
  const isWord = pluralize('is', 'are', currentOrder.volume_remain);
  const itemWord = pluralize('item', 'items', currentOrder.volume_remain);
  const droppedRoseWord = droppedRose(currentOrder.price - entry.tracking_price);
  const changeText = makeCode(`${formatNumber(change)} ISK`);

  const itemName = items.filter((_) => _.itemID === entry.item_id)[0].name.en as string;
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
