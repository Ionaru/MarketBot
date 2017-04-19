import * as Discord from 'discord.js';
import { items } from '../market-bot';
import { regionList } from '../regions';
import { PriceData } from '../typings';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchItemPrice } from '../helpers/api';
import { formatNumber } from '../helpers/formatters';
import { logCommand } from '../helpers/logger';

export async function priceFunction(discordMessage: Discord.Message) {

  const message = parseMessage(discordMessage);

  const replyPlaceholder = <Discord.Message> await discordMessage.channel.sendMessage(
    `Checking price, one moment, ${discordMessage.author.username}...`);

  let reply = '';

  let itemData = items.filter(_ => {
    if (_.name.en) {
      return _.name.en.toUpperCase() === message.item.toUpperCase();
    }
  })[0];
  if (!itemData) {
    itemData = guessUserItemInput(message.item);
    if (itemData) {
      reply += `'${message.item}' didn't directly match any item I know of, my best guess is \`${itemData.name.en}\`\n`;
      // reply += '*Guessing words is really difficult for bots like me, ' +
      //     'please try to spell the words as accurate as possible.*\n';
      reply += '\n';
    }
  }

  let regionName;

  if (itemData) {

    let regionId = 10000002;

    if (message.region) {
      regionId = guessUserRegionInput(message.region);
      if (!regionId) {
        reply += `I don't know of the '${message.region}' region, defaulting to **The Forge**\n`;
        regionId = 10000002;
      }
    }

    regionName = regionList[regionId];

    const itemId = itemData.itemID;

    const json = await fetchItemPrice(itemId, regionId);

    if (json.length) {

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
        reply += `Price information for \`${itemData.name.en}\` in **${regionName}**:\n\n`;

        if (sellPrice !== 'unknown') {
          reply += `🡺 Lowest selling price is \`${lowestSellPrice}\`\n`;
          reply += `🡺 Average selling price is \`${sellPrice}\`\n`;
        } else {
          reply += '🡺 Selling price data is unavailable\n';
        }

        reply += '\n';
        if (buyPrice !== 'unknown') {
          reply += `🡺 Highest buying price is \`${highestBuyPrice}\`\n`;
          reply += `🡺 Average buying price is \`${buyPrice}\`\n`;
        } else {
          reply += '🡺 Buying price data is unavailable\n';
        }

        await replyPlaceholder.edit(reply);

      } else {
        reply += `I couldn't find any price information for '${itemData.name.en}' in **${regionName}**, sorry.`;
      }
    } else {
      reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
    }

  } else {
    reply = `I don't know what you mean with '${message.item}' 😟`;
  }
  await replyPlaceholder.edit(reply);
  logCommand('orders', discordMessage, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
}
