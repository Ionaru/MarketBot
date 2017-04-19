import * as Discord from 'discord.js';
import { items, universeApi } from '../market-bot';
import { regionList } from '../regions';
import { MarketData } from '../typings';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatNumber, pluralize } from '../helpers/formatters';
import { logCommand } from '../helpers/command-logger';

export async function ordersFunction(discordMessage: Discord.Message) {
  const message = parseMessage(discordMessage);

  const replyPlaceHolder = <Discord.Message> await discordMessage.channel.sendMessage(
    `Searching for the cheapest orders, one moment, ${discordMessage.author.username}...`
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
        reply += `'${message.item}' didn't directly match any item I know of, my best guess is \`${itemData.name.en}\`\n`;
        // reply += '*Guessing words is really difficult for bots like me, ' +
        //     'please try to spell the words as accurate as possible.*\n\n';
      }
    }

    if (itemData) {

      let regionId = 10000002;

      if (message.region) {
        regionId = guessUserRegionInput(message.region);
        if (!regionId) {
          reply += `I don't know of the '${message.region}' region, defaulting to **The Forge**\n`;
          regionId = 10000002;
        }
      }

      reply += '\n';

      regionName = regionList[regionId];

      const itemId = itemData.itemID;

      const marketData = await fetchMarketData(itemId, regionId);

      if (marketData) {

        const sellOrders = marketData.filter(_ => _.is_buy_order === false);

        if (sellOrders && sellOrders.length) {

          const sellOrdersSorted: Array<MarketData> = sortArrayByObjectProperty(sellOrders, 'price');

          const cheapestOrder = sellOrdersSorted[0];
          const price = cheapestOrder.price;

          let locationIds = [];
          for (const order of sellOrdersSorted) {
            locationIds.push(order.location_id);
          }

          locationIds = [...new Set(locationIds)];

          const nameData = await universeApi.postUniverseNames(locationIds);
          const locationNames = nameData.body;

          reply += `The cheapest \`${itemData.name.en}\` orders in **${regionName}**:\n\n`;

          const limit = message.limit || 5;
          let iter = 0;
          for (const order of sellOrdersSorted) {
            const orderPrice = formatNumber(order.price);
            const locationName = locationNames.filter(_ => _.id === order.location_id)[0].name;
            const volume = formatNumber(order.volume_remain, 0);
            const itemWord = pluralize('item', 'items', order.volume_remain);

            const replyAddition = `\`${orderPrice} ISK\` at \`${locationName}\`, \`${volume}\` ${itemWord} left.\n`;

            // Discord messages can not be longer than 2000 characters, if this command is issued with a
            // large limit, it can exceed that.
            if (replyAddition.length + reply.length < 2000) {
              // Adding this line will not make the message exceed the character limit, carry on.
              reply += replyAddition;
            } else {
              // We've reached the character limit, break from the loop.
              break;
            }

            iter++;
            if (iter >= limit) {
              break;
            }
          }

        } else {
          reply += `I couldn't find any orders for '${itemData.name.en}' in **${regionName}**.`;
        }
      } else {
        reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
      }
    } else {
      reply = `I don't know what you mean with '${message.item}' 😟`;
    }
  } else {
    reply = 'You need to give me an item to search for.';
  }
  await replyPlaceHolder.edit(reply);
  logCommand('orders', discordMessage, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
}
