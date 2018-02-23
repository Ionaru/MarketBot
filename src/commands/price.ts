import * as Discord from 'discord.js';
import { Message } from '../chat-service/discord/message';
import { fetchPriceData } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber } from '../helpers/formatters';
import { getGuessHint, guessUserItemInput, guessUserRegionInput, guessUserSystemInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { systemList } from '../market-bot';
import { regionList } from '../regions';
import { IParsedMessage, IPriceData, ISDEObject } from '../typings';

interface IPriceCommandLogicReturn {
  reply: Discord.RichEmbed;
  itemData: ISDEObject | undefined;
  locationName: string | undefined;
}

export async function priceCommand(message: Message, transaction: any) {
  const messageData = parseMessage(message.content);

  const replyPlaceHolder = await message.reply(
    `Checking price, one moment, ${message.sender}...`
  );

  const {reply, itemData, locationName} = await priceCommandLogic(messageData);

  await replyPlaceHolder.edit('', {embed: reply});

  logCommand('price', message, (itemData ? itemData.name.en : undefined), (locationName ? locationName : undefined), transaction);
}

async function priceCommandLogic(messageData: IParsedMessage): Promise<IPriceCommandLogicReturn> {

  const reply = new Discord.RichEmbed();

  let locationName = '';

  if (!(messageData.item && messageData.item.length)) {
    reply.addField('Error', 'You need to give me an item to search for.');
    return {reply, itemData: undefined, locationName};
  }

  const {itemData, guess, id}: IGuessReturn = guessUserItemInput(messageData.item);

  const guessHint = getGuessHint({itemData, guess, id}, messageData.item);
  if (guessHint) {
    reply.addField('Warning', guessHint);
  }

  if (!itemData) {
    return {reply, itemData: undefined, locationName};
  }

  let locationId: number | void = 10000002;
  locationName = regionList[locationId];

  if (messageData.region) {
    locationId = guessUserRegionInput(messageData.region);
    if (!locationId) {
      locationId = 10000002;
      reply.addField('Warning', `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(regionList[locationId])}`);
    }
    locationName = regionList[locationId];
  }

  if (messageData.system) {
    locationId = guessUserSystemInput(messageData.system);
    if (!locationId) {
      locationId = 30000142;
      reply.addField('Warning', `I don't know of the "${messageData.system}" system, defaulting to ${regionFormat(systemList[locationId])}`);
    }
    locationName = systemList[locationId];
  }

  const json = await fetchPriceData(itemData.itemID, locationId);

  if (!(json && json.length)) {
    reply.addField('Error', `My apologies, I was unable to fetch the required data from the web, please try again later.`);
    return {reply, itemData, locationName};
  }

  const sellData: IPriceData = json[0].sell;
  const buyData: IPriceData = json[0].buy;

  let sellPrice = 'unknown';
  let lowestSellPrice = 'unknown';
  if (sellData.fivePercent && sellData.fivePercent !== 0) {
    sellPrice = formatNumber(sellData.wavg) + ' ISK';
    lowestSellPrice = formatNumber(sellData.fivePercent) + ' ISK';
  }

  let buyPrice = 'unknown';
  let highestBuyPrice = 'unknown';
  if (buyData.fivePercent && buyData.fivePercent !== 0) {
    buyPrice = formatNumber(buyData.wavg) + ' ISK';
    highestBuyPrice = formatNumber(buyData.fivePercent) + ' ISK';
  }

  if (sellPrice === 'unknown' && buyPrice === 'unknown') {
    const itemName = itemFormat(itemData.name.en as string);
    const replyText = `I couldn't find any price information for ${itemName} in ${regionFormat(locationName)}, sorry.`;
    reply.addField('No data', replyText);
    return {reply, itemData, locationName};
  }

  reply.setAuthor(itemData.name.en, `http://data.saturnserver.org/eve/Icons/UI/WindowIcons/wallet.png`);
  reply.setDescription(`Price information for ${regionFormat(locationName)}`);
  reply.setThumbnail(`https://image.eveonline.com/Type/${itemData.itemID}_64.png`);

  let sellInfo = '';
  if (sellPrice !== 'unknown') {
    sellInfo += `* Lowest selling price is ${itemFormat(lowestSellPrice)}` + newLine();
    sellInfo += `* Average selling price is ${itemFormat(sellPrice)}` + newLine();
  } else {
    sellInfo += '* Selling price data is unavailable' + newLine();
  }
  reply.addField('Sell', sellInfo);

  let buyInfo = '';
  if (buyPrice !== 'unknown') {
    buyInfo += `* Highest buying price is ${itemFormat(highestBuyPrice)}` + newLine();
    buyInfo += `* Average buying price is ${itemFormat(buyPrice)}` + newLine();
  } else {
    buyInfo += '* Buying price data is unavailable' + newLine();
  }
  reply.addField('Buy', buyInfo);

  return {reply, itemData, locationName};
}
