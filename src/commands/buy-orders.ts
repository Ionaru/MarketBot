import * as Discord from 'discord.js';
import { citadels, items, universeApi } from '../market-bot';
import { regionList } from '../regions';
import { MarketData } from '../typings';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatNumber, pluralize } from '../helpers/formatters';
import { logCommand } from '../helpers/command-logger';

export async function buyOrdersFunction(discordMessage: Discord.Message) {
  const message = parseMessage(discordMessage);

  const replyPlaceHolder = <Discord.Message> await discordMessage.channel.send(
    `Searching for the highest buy orders, one moment, ${discordMessage.author.username}...`
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
        reply += `"${message.item}" didn't directly match any item I know of, my best guess is \`${itemData.name.en}\`\n`;
        // reply += '*Guessing words is really difficult for bots like me, ' +
        //     'please try to spell the words as accurate as possible.*\n\n';
      }
    }

    if (itemData) {

      let regionId = 10000002;

      if (message.region) {
        regionId = guessUserRegionInput(message.region);
        if (!regionId) {
          reply += `I don't know of the "${message.region}" region, defaulting to **The Forge**\n`;
          regionId = 10000002;
        }
      }

      reply += '\n';

      regionName = regionList[regionId];

      const itemId = itemData.itemID;

      const marketData = await fetchMarketData(itemId, regionId);

      if (marketData) {

        const buyOrders = marketData.filter(_ => _.is_buy_order === true);

        if (buyOrders && buyOrders.length) {

          const buyOrdersSorted: Array<MarketData> = sortArrayByObjectProperty(buyOrders, 'price', true);

          const bestOrder = buyOrdersSorted[0];
          const price = bestOrder.price;

          let locationIds = [];
          for (const order of buyOrdersSorted) {
            if (order.location_id < 100000000) {
              locationIds.push(order.location_id);
            }
          }

          locationIds = [...new Set(locationIds)];

          const nameData = await universeApi.postUniverseNames(locationIds);
          const locationNames = nameData.body;

          reply += `The highest \`${itemData.name.en}\` buy orders in **${regionName}**:\n\n`;

          const limit = message.limit || 3;
          let iter = 0;
          for (const order of buyOrdersSorted) {
            const orderPrice = formatNumber(order.price);
            const location = locationNames.filter(_ => _.id === order.location_id)[0];
            let locationName = 'Unknown location';
            if (location) {
              locationName = location.name;
            } else {
              const citadel = citadels[order.location_id];
              if (citadel) {
                locationName = citadel.name;
              } else {
                locationName = 'An unknown citadel';
              }
            }

            const volume = formatNumber(order.volume_remain, 0);
            const itemWord = pluralize('item', 'items', order.volume_remain);
            let range = order.range;
            if (Number(range)) {
              range += pluralize(' jump', ' jumps', Number(range));
            }

            const replyAddition =
              `\`${orderPrice} ISK\` for \`${volume}\` ${itemWord} with \`${range}\` order range from \`${locationName}\`\n`;

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
          reply += `It seems nobody is buying \`${itemData.name.en}\` in **${regionName}**.`;
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
  await replyPlaceHolder.edit(reply);
  logCommand('buy-orders', discordMessage, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
}
