import * as Discord from 'discord.js';
import { items } from '../market-bot';
import { regionList } from '../regions';
import { PriceData } from '../typings';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchItemPrice } from '../helpers/api';
import { formatNumber } from '../helpers/formatters';
import { logCommand } from '../helpers/command-logger';
import { Message, newLine } from '../helpers/message-interface';
import { itemFormat, regionFormat } from '../helpers/message-formatter';

export async function priceFunction(messageObject: Message) {
  const message = parseMessage(messageObject.content);

  const replyPlaceholder = <Discord.Message> await messageObject.reply(
    `Checking price, one moment, ${messageObject.sender}...`
  );

  let reply = '';
  let itemData;
  let regionName;

  if (message.item && message.item.length) {

    itemData = items.filter(_ => {
      if (_.name.en) {
        return _.name.en.toUpperCase() === message.item.toUpperCase();
      }
    })[0];
    if (!itemData) {
      itemData = guessUserItemInput(message.item);
      if (itemData) {
        reply += `"${message.item}" didn't directly match any item I know of, my best guess is ${itemFormat(itemData.name.en)}`;
        reply += newLine();
        // reply += '*Guessing words is really difficult for bots like me, ' +
        //     'please try to spell the words as accurate as possible.*\n';
      }
    }

    if (itemData) {

      let regionId = 10000002;

      if (message.region) {
        regionId = guessUserRegionInput(message.region);
        if (!regionId) {
          reply += `I don't know of the "${message.region}" region, defaulting to ${regionFormat('The Forge')}`;
          reply += newLine();
          regionId = 10000002;
        }
      }

      reply += newLine();

      regionName = regionList[regionId];

      const itemId = itemData.itemID;

      const json = await fetchItemPrice(itemId, regionId);

      if (json && json.length) {

        const sellData: PriceData = json[0]['sell'];
        const buyData: PriceData = json[0]['buy'];

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

        if (sellPrice !== 'unknown' || buyPrice !== 'unknown') {
          reply += `Price information for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}:` + newLine(2);

          if (sellPrice !== 'unknown') {
            reply += `- Lowest selling price is ${itemFormat(lowestSellPrice)}` + newLine();
            reply += `- Average selling price is ${itemFormat(sellPrice)}` + newLine();
          } else {
            reply += '- Selling price data is unavailable' + newLine();
          }

          reply += '\n';
          if (buyPrice !== 'unknown') {
            reply += `- Highest buying price is ${itemFormat(highestBuyPrice)}` + newLine();
            reply += `- Average buying price is ${itemFormat(buyPrice)}` + newLine();
          } else {
            reply += '- Buying price data is unavailable\n';
          }

        } else {
          reply += `I couldn't find any price information for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}, sorry.`;
        }
      } else {
        reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
      }
    } else {
      reply = `I don't know what you mean with "${message.item}" 😟`;
    }
  } else {
    reply = 'You need to give me an item to search for.';
  }
  await replyPlaceholder.edit(reply);
  logCommand('price', message, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
}
