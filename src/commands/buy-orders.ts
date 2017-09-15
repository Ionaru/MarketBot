import { Message } from '../chat-service/discord/message';
import { maxMessageLength } from '../chat-service/discord/misc';
import { fetchMarketData, fetchUniverseNames } from '../helpers/api';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { logCommand } from '../helpers/command-logger';
import { formatNumber, pluralize } from '../helpers/formatters';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { items } from '../helpers/items-loader';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { citadels } from '../market-bot';
import { regionList } from '../regions';
import { IMarketData, INamesData, IParsedMessage, ISDEObject } from '../typings';

interface IBuyOrdersCommandLogicReturn {
  reply: string;
  itemData: ISDEObject | undefined;
  regionName: string | undefined;
}

export async function buyOrdersCommand(message: Message) {
  const messageData = parseMessage(message.content);

  messageData.limit = messageData.limit || 5;
  const orderWord = pluralize('order', 'orders', messageData.limit);

  const replyPlaceHolder = await message.reply(
    `Searching for the highest buy ${orderWord}, one moment, ${message.sender}...`
  );

  const {reply, itemData, regionName} = await buyOrdersCommandLogic(messageData);

  await replyPlaceHolder.edit(reply);
  logCommand('buy-orders', message, (itemData ? itemData.name.en : undefined), (regionName ? regionName : undefined));
}

async function buyOrdersCommandLogic(messageData: IParsedMessage): Promise<IBuyOrdersCommandLogicReturn> {

  let itemData: ISDEObject;
  let regionName = '';
  let reply = '';

  if (!(messageData.item && messageData.item.length)) {
    reply += 'You need to give me an item to search for.';
    return {reply, itemData: undefined, regionName};
  }

  itemData = items.filter((_) => (_.name.en && _.name.en.toUpperCase() === messageData.item.toUpperCase()))[0];
  if (!itemData) {
    itemData = guessUserItemInput(messageData.item);
    if (itemData) {
      reply += `"${messageData.item}" didn't directly match any item I know of, my best guess is ${itemFormat(itemData.name.en)}`;
      reply += newLine(2);
    } else {
      reply += `I don't know what you mean with "${messageData.item}" 😟`;
      return {reply, itemData: undefined, regionName};
    }
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

  const itemId = itemData.itemID;

  const marketData = await fetchMarketData(itemId, regionId);

  if (!marketData) {
    reply += 'My apologies, I was unable to fetch the required data from the web, please try again later.';
    return {reply, itemData, regionName};
  }

  let buyOrders: IMarketData[] = marketData.filter((_) => _.is_buy_order === true);

  if (!(buyOrders && buyOrders.length)) {
    reply += `It seems nobody is buying ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}.`;
    return {reply, itemData, regionName};
  }

  buyOrders = sortArrayByObjectProperty(buyOrders, 'price', true).slice(0, messageData.limit);

  let locationIds = [];
  for (const order of buyOrders) {
    if (order.location_id < 100000000) {
      locationIds.push(order.location_id);
    }
  }

  locationIds = [...new Set(locationIds)];

  let locationNames: INamesData[] = [];
  if (locationIds.length) {
    locationNames = await fetchUniverseNames(locationIds);
  }

  const orderWord = pluralize('order', 'orders', messageData.limit);
  reply += `The highest ${itemFormat(itemData.name.en)} buy ${orderWord} in ${regionFormat(regionName)}:`;
  reply += newLine(2);

  for (const order of buyOrders) {
    const orderPrice = formatNumber(order.price);
    const location = locationNames.filter((_) => _.id === order.location_id)[0];
    let locationName = `an unknown location with ID ${order.location_id}`;
    if (location) {
      locationName = location.name;
    } else if (order.location_id.toString().length === 13) {
      const citadel = citadels[order.location_id];
      locationName = citadel ? citadel.name : 'an unknown citadel';
    }

    const volume = formatNumber(order.volume_remain, 0);
    const itemWord = pluralize('item', 'items', order.volume_remain);
    let range = order.range;
    if (Number(range)) {
      range += pluralize(' jump', ' jumps', Number(range));
    }

    let volumeAddition = '';
    if (order.min_volume !== 1) {
      const volumeWord = pluralize('item', 'items', order.min_volume);
      const minVol = formatNumber(order.min_volume, 0);
      volumeAddition = makeBold(`(min: ${makeCode(minVol)} ${volumeWord}) `);
    }

    let replyAddition = `${makeCode(orderPrice + ' ISK')} for ${makeCode(volume)} ${itemWord} ${volumeAddition}`;
    replyAddition += `with ${makeCode(range)} order range from ${makeCode(locationName)}`;
    replyAddition += newLine();

    // Messages can not be longer than 2000 characters, if this command is issued with a
    // large limit, it can exceed that.
    if (replyAddition.length + reply.length < maxMessageLength) {
      // Adding this line will not make the message exceed the character limit, carry on.
      reply += replyAddition;
    } else {
      // We've reached the character limit, break from the loop.
      break;
    }
  }
  return {reply, itemData, regionName};
}
