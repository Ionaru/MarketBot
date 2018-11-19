import * as Discord from 'discord.js';
import { Message } from '../chat-service/discord/message';
import { fetchPriceData } from '../helpers/api';
import { items, itemsFuse, regions, systems } from '../helpers/cache';
import { logCommand } from '../helpers/command-logger';
import { formatNumber } from '../helpers/formatters';
import { getGuessHint, guessUserInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { INamesData, IParsedMessage, IPriceData } from '../typings';

interface IPriceCommandLogicReturn {
  reply: Discord.RichEmbed;
  itemData: INamesData | undefined;
  locationName: string | undefined;
}

export async function priceCommand(message: Message, transaction: any) {
  const messageData = parseMessage(message.content);

  const replyPlaceHolder = await message.reply(`Checking price, one moment, ${message.sender}...`);

  const {reply, itemData, locationName} = await priceCommandLogic(messageData);

  await replyPlaceHolder.edit('', {embed: reply});

  logCommand('price', message, (itemData ? itemData.name : undefined), (locationName ? locationName : undefined), transaction);
}

async function priceCommandLogic(messageData: IParsedMessage): Promise<IPriceCommandLogicReturn> {

  const reply = new Discord.RichEmbed();

  let locationName = '';

  if (!(messageData.item && messageData.item.length)) {
    reply.addField('Error', 'You need to give me an item to search for.');
    return {reply, itemData: undefined, locationName};
  }

  const {itemData, guess, id}: IGuessReturn = await guessUserInput(messageData.item, items, itemsFuse);

  const guessHint = getGuessHint({itemData, guess, id}, messageData.item);
  if (guessHint) {
    reply.addField('Warning', guessHint);
  }

  if (!itemData.id) {
    return {reply, itemData: undefined, locationName};
  }

  const defaultLocation = regions.filter((region) => region.name === 'The Forge')[0];
  let location = defaultLocation;

  if (messageData.region) {
    location = (await guessUserInput(messageData.region, regions)).itemData;
    if (!location.id) {
      location = defaultLocation;
      reply.addField('Warning', `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(location.name)}`);
    }
  }

  if (messageData.system) {
    location = (await guessUserInput(messageData.system, systems)).itemData;
    if (!location.id) {
      location = defaultLocation;
      reply.addField('Warning', `I don't know of the "${messageData.system}" system, defaulting to ${regionFormat(location.name)}`);
    }
  }

  locationName = location.name;

  const json = await fetchPriceData(itemData.id, location.id);

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
    const itemName = itemFormat(itemData.name);
    const replyText = `I couldn't find any price information for ${itemName} in ${regionFormat(locationName)}, sorry.`;
    reply.addField('No data', replyText);
    return {reply, itemData, locationName};
  }

  reply.setAuthor(itemData.name, `http://data.saturnserver.org/eve/Icons/UI/WindowIcons/wallet.png`);
  reply.setDescription(`Price information for ${regionFormat(locationName)}`);
  reply.setThumbnail(`https://image.eveonline.com/Type/${itemData.id}_64.png`);

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
