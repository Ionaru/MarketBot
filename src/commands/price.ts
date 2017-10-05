import { Message } from '../chat-service/discord/message';
import { fetchPriceData } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber } from '../helpers/formatters';
import { guessUserItemInput, guessUserRegionInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { regionList } from '../regions';
import { IPriceData } from '../typings';

export async function priceFunction(message: Message) {

  const messageData = parseMessage(message.content);

  const replyPlaceholder = await message.reply(
    `Checking price, one moment, ${message.sender}...`
  );

  let reply = '';
  let regionName = '';

  if (!(messageData.item && messageData.item.length)) {
    reply = 'You need to give me an item to search for.';
    return await replyPlaceholder.edit(reply);
  }

  const {itemData, guess}: IGuessReturn = guessUserItemInput(messageData.item);

  if (!itemData) {
    reply += `I don't know what you mean with "${messageData.item}" 😟`;
    return {reply, itemData: undefined, regionName};
  }

  if (guess) {
    reply += `"${messageData.item}" didn't directly match any item I know of, my best guess is ${itemFormat(itemData.name.en as string)}`;
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

  const itemId = itemData.itemID;

  const json = await fetchPriceData(itemId, regionId);

  if (!(json && json.length)) {
    reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
    return await replyPlaceholder.edit(reply);
  }

  const sellData: IPriceData = json[0].sell;
  const buyData: IPriceData = json[0].buy;

  let sellPrice = 'unknown';
  let lowestSellPrice = 'unknown';
  if (sellData.fivePercent && sellData.fivePercent !== 0) {
    sellPrice = formatNumber(sellData.fivePercent) + ' ISK';
    lowestSellPrice = formatNumber(sellData.min) + ' ISK';
  }

  let buyPrice = 'unknown';
  let highestBuyPrice = 'unknown';
  if (buyData.fivePercent && buyData.fivePercent !== 0) {
    buyPrice = formatNumber(buyData.fivePercent) + ' ISK';
    highestBuyPrice = formatNumber(buyData.max) + ' ISK';
  }

  if (sellPrice === 'unknown' && buyPrice === 'unknown') {
    reply += `I couldn't find any price information for ${itemFormat(itemData.name.en as string)} in ${regionFormat(regionName)}, sorry.`;
    return await replyPlaceholder.edit(reply);
  }

  reply += `Price information for ${itemFormat(itemData.name.en as string)} in ${regionFormat(regionName)}:` + newLine(2);

  if (sellPrice !== 'unknown') {
    reply += `- Lowest selling price is ${itemFormat(lowestSellPrice)}` + newLine();
    reply += `- Average selling price is ${itemFormat(sellPrice)}` + newLine();
  } else {
    reply += '- Selling price data is unavailable' + newLine();
  }

  reply += newLine();
  if (buyPrice !== 'unknown') {
    reply += `- Highest buying price is ${itemFormat(highestBuyPrice)}` + newLine();
    reply += `- Average buying price is ${itemFormat(buyPrice)}` + newLine();
  } else {
    reply += '- Buying price data is unavailable' + newLine();
  }

  await replyPlaceholder.edit(reply);
  logCommand('price', message, (itemData ? itemData.name.en : undefined), (regionName ? regionName : undefined));
}
