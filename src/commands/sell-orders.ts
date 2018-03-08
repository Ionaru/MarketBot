import { Message } from '../chat-service/discord/message';
import { maxMessageLength } from '../chat-service/discord/misc';
import { fetchMarketData, fetchUniverseNames } from '../helpers/api';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { logCommand } from '../helpers/command-logger';
import { formatNumber, pluralize } from '../helpers/formatters';
import { getGuessHint, guessUserInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { items, regions, regionsFuse } from '../market-bot';
import { IMarketData, INamesData, IParsedMessage } from '../typings';

interface ISellOrdersCommandLogicReturn {
  reply: string;
  itemData: INamesData | undefined;
  regionName: string | undefined;
}

export async function sellOrdersCommand(message: Message, transaction: any) {
  const messageData = parseMessage(message.content);

  messageData.limit = messageData.limit || 5;
  const orderWord = pluralize('order', 'orders', messageData.limit);

  const replyPlaceHolder = await message.reply(
    `Searching for the cheapest sell ${orderWord}, one moment, ${message.sender}...`
  );

  const {reply, itemData, regionName} = await sellOrdersCommandLogic(messageData);

  await replyPlaceHolder.edit(reply);
  logCommand('sell-orders', message, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
}

async function sellOrdersCommandLogic(messageData: IParsedMessage): Promise<ISellOrdersCommandLogicReturn> {

  let regionName = '';
  let reply = '';

  if (!(messageData.item && messageData.item.length)) {
    reply += 'You need to give me an item to search for.';
    return {reply, itemData: undefined, regionName};
  }

  const {itemData, guess, id}: IGuessReturn = guessUserInput(messageData.item, items);

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

  const itemId = itemData.id;

  const marketData = await fetchMarketData(itemId, region.id);

  if (!marketData) {
    reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
    return {reply, itemData, regionName};
  }

  let sellOrders: IMarketData[] = marketData.filter((_) => _.is_buy_order === false);

  if (!(sellOrders && sellOrders.length)) {
    reply += `I couldn't find any sell orders for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}.`;
    return {reply, itemData, regionName};
  }

  sellOrders = sortArrayByObjectProperty(sellOrders, 'price').slice(0, messageData.limit);

  let locationIds = [];
  for (const order of sellOrders) {
    locationIds.push(order.location_id);
  }

  locationIds = [...new Set(locationIds)];

  let locationNames: INamesData[] = [];
  if (locationIds.length) {
    locationNames = await fetchUniverseNames(locationIds);
  }

  const orderWord = pluralize('order', 'orders', messageData.limit);
  reply += `The cheapest ${itemFormat(itemData.name)} sell ${orderWord} in ${regionFormat(regionName)}:`;
  reply += newLine(2);

  for (const order of sellOrders) {
    const orderPrice = formatNumber(order.price);

    const locationNameData = locationNames.filter((_) => _.id === order.location_id)[0];
    const locationName = locationNameData ? locationNameData.name : `an unknown location with ID ${order.location_id}`;

    const volume = formatNumber(order.volume_remain, 0);
    const itemWord = pluralize('item', 'items', order.volume_remain);

    let replyAddition = `${makeCode(orderPrice + ' ISK')} at ${makeCode(locationName)}, ${makeCode(volume)} ${itemWord} left.`;
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
