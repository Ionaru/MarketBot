import Timer = NodeJS.Timer;
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { logger } from 'winston-pnp-logger';

import { Message } from '../chat-service/discord/message';
import { getCheapestOrder } from '../helpers/api';
import { items, itemsFuse, regions, regionsFuse } from '../helpers/cache';
import { logCommand } from '../helpers/command-logger';
import { formatNumber, pluralize } from '../helpers/formatters';
import { getGuessHint, guessUserInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { client } from '../market-bot';
import { IMarketData, INamesData } from '../typings';

// tslint:disable:variable-name
@Entity('TrackingEntries')
export class TrackingEntry extends BaseEntity {

  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public item_id!: number;

  // noinspection TsLint
  @Column()
  public channel_id!: string;

  // noinspection TsLint
  @Column()
  public sender_id!: string;

  // noinspection TsLint
  @Column()
  public region_id!: number;

  // noinspection TsLint
  @Column({type: 'decimal'})
  public tracking_limit!: number;

  // noinspection TsLint
  @Column({type: 'decimal'})
  public tracking_price!: number;

  // noinspection TsLint
  @Column()
  public tracking_type!: 'buy' | 'sell';
}
// tslint:enable:variable-name

let trackingCycle: Timer | undefined;

interface ITrackCommandLogicReturn {
  reply: string;
  itemData: INamesData | undefined;
  regionName: string | undefined;
}

export function startTrackingCycle() {
  logger.debug('Scheduled next tracking cycle');
  trackingCycle = setInterval(() => {
    performTrackingCycle().then();
  }, 5 * 60 * 1000);
}

export function stopTrackingCycle() {
  if (trackingCycle !== undefined) {
    logger.debug('Stopping tracking cycle');
    clearInterval(trackingCycle);
    trackingCycle = undefined;
  }
}

export async function trackCommand(message: Message, type: 'buy' | 'sell', transaction: any): Promise<void> {
  const replyPlaceHolder = await message.reply(`Setting up for price tracking, one moment, ${message.sender}...`);

  const {reply, itemData, regionName} = await trackCommandLogic(message, type);

  await replyPlaceHolder.edit(reply);
  logCommand(`track-${type}-order`, message, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
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

  const {itemData, guess, id}: IGuessReturn = guessUserInput(messageData.item, items, itemsFuse);

  reply += getGuessHint({itemData, guess, id}, messageData.item);

  if (!itemData) {
    return {reply, itemData: undefined, regionName};
  }

  const defaultRegion = regions.filter((_) => _.name === 'The Forge')[0];
  let region = defaultRegion;

  if (messageData.region) {
    region = guessUserInput(messageData.region, regions, regionsFuse).itemData;
    if (!region.id) {
      region = defaultRegion;
      reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(region.name)}`;
      reply += newLine(2);
    }
  }

  regionName = region.name;

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
    (_.item_id === itemData.id && _.region_id === region.id && _.tracking_type === type && _.channel_id === message.channel.id),
  );
  if (channelItemDup.length !== 0) {
    reply += `I am already tracking the ${type} price for ${itemFormat(itemData.name)} in this channel.`;
    return {reply, itemData, regionName};
  }

  const originalOrder = await getCheapestOrder(type, itemData.id, region.id);
  if (!originalOrder) {
    reply += `I couldn't find any ${makeBold(type)} orders for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}.`;
    return {reply, itemData, regionName};
  }

  const originalPrice = originalOrder.price;

  reply += `Started ${makeBold(type)} price tracking for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}, ` +
    `I'll warn you when the ${makeBold(type)} price changes ${makeCode(formatNumber(changeLimit) + ' ISK')}. ` +
    ` Right now the price is ${makeCode(formatNumber(originalPrice) + ' ISK')}`;
  reply += newLine(2);

  const entry = new TrackingEntry();
  entry.channel_id = message.channel.id;
  entry.item_id = itemData.id;
  entry.region_id = region.id;
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

export async function clearTrackingCommand(message: Message, transaction: any): Promise<void> {
  let reply = `All entries cleared from this channel, ${message.sender}.`;

  const messageData = parseMessage(message.content);
  let itemId: number | undefined;
  let itemData: IGuessReturn | undefined;
  if (messageData.item && messageData.item.length) {
    itemData = guessUserInput(messageData.item, items, itemsFuse);
    if (itemData.itemData && itemData.itemData.name) {
      itemId = itemData.itemData.id;
    }
  }

  const trackingEntries: TrackingEntry[] = await TrackingEntry.find();
  if (trackingEntries && trackingEntries.length) {
    let entries = trackingEntries.filter((_) => _.channel_id === message.channel.id);
    if (itemId && itemData && itemData.itemData && itemData.itemData.name) {
      reply = `All entries for ${itemFormat(itemData.itemData.name)} cleared from this channel, ${message.sender}.`;
      entries = entries.filter((_) => _.item_id === itemId);
    }

    for (const entry of entries) {
      await entry.remove();
    }
  }
  await message.reply(reply);
  logCommand(`track-clear`, message, undefined, undefined, transaction);
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
      (_.entry.item_id === entry.item_id && _.entry.region_id === entry.region_id),
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
      order: currentOrder ? currentOrder : undefined,
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

  const itemName = items.filter((_) => _.id === entry.item_id)[0].name;
  const regionName = regions.filter((_) => _.id === entry.region_id)[0].name;

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
