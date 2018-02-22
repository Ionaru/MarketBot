import * as Discord from 'discord.js';
import { Message } from '../chat-service/discord/message';
import { fetchPriceData } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber } from '../helpers/formatters';
import { getGuessHint, guessUserItemInput, guessUserRegionInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { regionList } from '../regions';
import { IParsedMessage, IPriceData, ISDEObject } from '../typings';

interface IPriceCommandLogicReturn {
  reply: Discord.RichEmbed;
  itemData: ISDEObject | undefined;
  regionName: string | undefined;
}

export async function priceCommand(message: Message, transaction: any) {
  const messageData = parseMessage(message.content);

  const replyPlaceHolder = await message.reply(
    `Checking price, one moment, ${message.sender}...`
  );

  const replyEmbed = new Discord.RichEmbed();

  const {reply, itemData, regionName} = await priceCommandLogic(messageData, replyEmbed);

  await replyPlaceHolder.edit('', {embed: reply});

  logCommand('price', message, (itemData ? itemData.name.en : undefined), (regionName ? regionName : undefined), transaction);
}

async function priceCommandLogic(messageData: IParsedMessage, reply: Discord.RichEmbed): Promise<IPriceCommandLogicReturn> {

  let regionName = '';

  if (!(messageData.item && messageData.item.length)) {
    reply.addField('Error', 'You need to give me an item to search for.');
    return {reply, itemData: undefined, regionName};
  }

  const {itemData, guess, id}: IGuessReturn = guessUserItemInput(messageData.item);

  const guessHint = getGuessHint({itemData, guess, id}, messageData.item);
  if (guessHint) {
    reply.addField('Warning', guessHint);
  }

  if (!itemData) {
    return {reply, itemData: undefined, regionName};
  }

  let regionId: number | void = 10000002;

  if (messageData.region) {
    regionId = guessUserRegionInput(messageData.region);
    if (!regionId) {
      regionId = 10000002;
      reply.addField('Warning', `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(regionList[regionId])}`);
    }
  }

  regionName = regionList[regionId];

  const itemId = itemData.itemID;

  const json = await fetchPriceData(itemId, regionId);

  if (!(json && json.length)) {
    reply.addField('Error', `My apologies, I was unable to fetch the required data from the web, please try again later.`);
    return {reply, itemData, regionName};
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
    const replyText = `I couldn't find any price information for ${itemName} in ${regionFormat(regionName)}, sorry.`;
    reply.addField('No data', replyText);
    return {reply, itemData, regionName};
  }

  reply.setAuthor(itemData.name.en, `http://data.saturnserver.org/eve/Icons/UI/WindowIcons/info.png`);
  reply.setDescription(`Price information for ${regionFormat(regionName)}`);
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

  return {reply, itemData, regionName};
}
