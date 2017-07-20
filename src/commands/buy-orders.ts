import { citadels, items, universeApi } from '../market-bot';
import { regionList } from '../regions';
import { MarketData } from '../typings';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatNumber, pluralize } from '../helpers/formatters';
import { logCommand } from '../helpers/command-logger';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { maxMessageLength, Message } from '../chat-service/discord-interface';

export async function buyOrdersFunction(message: Message) {
  const messageData = parseMessage(message.content);

  const replyPlaceHolder = await message.reply(
    `Searching for the highest buy orders, one moment, ${message.sender}...`
  );

  let reply = '';
  let itemData;
  let regionName;

  if (messageData.item && messageData.item.length) {

    itemData = items.filter(_ => {
      if (_.name.en) {
        return _.name.en.toUpperCase() === messageData.item.toUpperCase();
      }
    })[0];

    if (!itemData) {
      itemData = guessUserItemInput(messageData.item);
      if (itemData) {
        reply += `"${messageData.item}" didn't directly match any item I know of, my best guess is ${itemFormat(itemData.name.en)}`;
        reply += newLine(2);
      }
    }

    if (itemData) {

      let regionId = 10000002;

      if (messageData.region) {
        regionId = guessUserRegionInput(messageData.region);
        if (!regionId) {
          reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat('The Force')}`;
          reply += newLine();
          regionId = 10000002;
        }
      }

      reply += newLine();

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

          let locationNames = [];
          if (locationIds.length) {
            const nameData = await universeApi.postUniverseNames(locationIds);
            locationNames = nameData.body;
          }

          reply += `The highest ${itemFormat(itemData.name.en)} buy orders in ${regionFormat(regionName)}:`;
          reply += newLine(2);

          const limit = messageData.limit || 5;
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

            let volumeAddition = '';
            if (order.min_volume !== 1) {
              const volumeWord = pluralize('item', 'items', order.min_volume);
              const minVol = formatNumber(order.min_volume, 0);
              volumeAddition = makeBold(`(min: ${makeCode(minVol)} ${volumeWord}) `);
            }

            let replyAddition = `${makeCode(orderPrice + ' ISK')} for ${makeCode(volume)} ${itemWord} ${volumeAddition}`;
            replyAddition += `with ${makeCode(range)} order range from ${makeCode(locationName)}`;
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

            iter++;
            if (iter >= limit) {
              break;
            }
          }

        } else {
          reply += `It seems nobody is buying ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}.`;
        }
      } else {
        reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
      }
    } else {
      reply = `I don't know what you mean with "${messageData.item}" 😟`;
    }
  } else {
    reply = 'You need to give me an item to search for.';
  }
  await replyPlaceHolder.edit(reply);
  logCommand('buy-orders', message, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
}
