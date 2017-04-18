import * as Discord from 'discord.js';
import { items, universeApi } from '../market-bot';
import { regionList } from '../regions';
import { MarketData } from '../typings';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatISK, pluralize } from '../helpers/formatters';

export async function ordersFunction(discordMessage: Discord.Message) {
  const message = parseMessage(discordMessage);

  const replyPlaceHolder = <Discord.Message> await discordMessage.channel.sendMessage(
    `Searching for the cheapest orders, one moment, ${discordMessage.author.username}...`
  );

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
      //     'please try to spell the words as accurate as possible.*\n\n';
      reply += '\n';
    }
  }

  if (itemData) {

    let regionId = 10000002;

    if (message.region) {
      regionId = guessUserRegionInput(message.region);
      if (!regionId) {
        reply += `I don't know of the '${message.region}' region, defaulting to The Forge\n`;
        regionId = 10000002;
      }
    }

    const regionName = regionList[regionId];

    const itemId = itemData.itemID;

    const marketData = await fetchMarketData(itemId, regionId);

    const sellOrders = marketData.filter(_ => _.is_buy_order === false);

    if (sellOrders.length) {

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
        const orderPrice = formatISK(order.price);
        const locationName = locationNames.filter(_ => _.id === order.location_id)[0].name;
        const volume = order.volume_remain;
        const itemWord = pluralize('item', 'items', volume);

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
      reply += `I couldn't find any orders for '${itemData.name.en}' in **${regionName}**`;
    }

    replyPlaceHolder.edit(reply).then();

  } else {
    discordMessage.channel.sendMessage(`I don't know what you mean with '${message.item}' 😟`).then();
  }
}
