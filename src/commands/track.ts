import { items } from '../market-bot';
import { regionList } from '../regions';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { MarketData, SDEObject, TrackingEntry } from '../typings';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatNumber, pluralize } from '../helpers/formatters';
import { Message } from '../chat-service/discord-interface';
import { itemFormat, makeCode, newLine, regionFormat } from '../helpers/message-formatter';

const trackingEntries: Array<TrackingEntry> = [];

export async function trackFunction(message: Message) {
  let reply = '';

  if (message.isPrivate) {

    const messageData = parseMessage(message.content);

    let itemData: SDEObject;
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
            reply += newLine(2);
            regionId = 10000002;
          }
        }

        regionName = regionList[regionId];

        const endpointCacheTime = 300 * 1000; // 300 seconds

        const timeLimit = 24 * 60 * 60 * 1000;

        const endTime = Date.now() + timeLimit;

        let changeLimit = messageData.limit || 1;

        if (changeLimit < 0.01) {
          reply += makeCode('0.01 ISK') + ' is the minimum change amount I can handle.';
          reply += newLine();
          changeLimit = 0.01;
        }

        const originalOrder = await getCheapestOrder(itemData.itemID, regionId);
        const originalPrice = originalOrder.price;

        if (originalPrice) {

          reply += `Starting price tracking for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}, ` +
            `I'll warn you when the price changes ${makeCode(formatNumber(changeLimit) + ' ISK')}. ` +
            ` Right now the price is ${makeCode(formatNumber(originalPrice) + ' ISK')}`;

          trackingEntries.push({
            item: itemData,
            region: {
              name: regionName,
              id: regionId,
            },
            message: message,
            trackingLimit: changeLimit,
            trackingPrice: originalPrice,
            trackingStart: Date.now(),
            trackingDuration: timeLimit,
          });

          // const interval = setInterval(async () => {
          //   const marketData = await fetchMarketData(itemData.itemID, regionId);
          //   if (marketData) {
          //     const sellOrders = marketData.filter(_ => _.is_buy_order === false);
          //     if (sellOrders && sellOrders.length) {
          //       const sellOrdersSorted: Array<MarketData> = sortArrayByObjectProperty(sellOrders, 'price');
          //       const cheapestOrder = sellOrdersSorted[0];
          //       const price = cheapestOrder.price;
          //       if (price !== originalPrice) {
          //         const changeIsk = Math.abs(price - originalPrice);
          //         const b = +(Math.round(Number(changeIsk.toString() + 'e+' + '2')) + 'e-' + 2);
          //         console.log('change:', changeIsk, b);
          //         if (b >= changeLimit) {
          //           // const change = formatNumber(((price - Oprice) / Oprice) * 100, 10);
          //           const oldPrice = formatNumber(originalPrice) + ' ISK';
          //           const newPrice = formatNumber(price) + ' ISK';
          //           const isWord = pluralize('is', 'are', cheapestOrder.volume_remain);
          //           const itemWord = pluralize('item', 'items', cheapestOrder.volume_remain);
          //           let plus = '-';
          //           if (newPrice > oldPrice) {
          //             plus = '+';
          //           }
          //
          //           let tReply = `Attention, price change detected! for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}:`;
          //           tReply += `The price for ${itemFormat(itemData.name.en)} ${droppedRose(b)} ${makeCode(`${plus}${b} ISK`)}`;
          //           tReply += newLine(2);
          //           tReply += `${makeCode(oldPrice)} to ${makeCode(newPrice)}, change: ${makeCode(`${plus}${b} ISK`)}, `;
          //           tReply += `There ${isWord} ${makeCode(cheapestOrder.volume_remain.toString())} ${itemWord} available for this price.`;
          //           await message.reply(tReply);
          //           originalPrice = price;
          //         }
          //         // clearInterval(interval);
          //       }
          //     }
          //   }
          //   if (endTime <= Date.now()) {
          //     await message.reply('Tracking duration expired.');
          //     clearInterval(interval);
          //   }
          //
          // }, endpointCacheTime);
        } else {
          reply += `I couldn't find any sell orders for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}.`;
        }
      } else {
        reply = `I don't know what you mean with "${messageData.item}" 😟`;
      }
    } else {
      reply = 'You need to give me an item to track.';
    }
    // await replyPlaceholder.edit(reply);
    // logCommand('orders', discordMessage, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
  } else {
    reply = 'Please send me a private message to have me track an item price for you.';
  }
  await message.reply(reply);
}

function droppedRose(amount) {

}

async function getCheapestOrder(itemId: number, regionId: number): Promise<MarketData> {
  const marketData = await fetchMarketData(itemId, regionId);
  if (marketData) {
    const sellOrders = marketData.filter(_ => _.is_buy_order === false);
    if (sellOrders && sellOrders.length) {
      const sortedSellOrders: Array<MarketData> = sortArrayByObjectProperty(sellOrders, 'price');
      return sortedSellOrders[0];
    }
  }
  return null;
}

setInterval(async () => {
  const entriesDone: Array<TrackingEntry> = [];

  for (const entry of trackingEntries) {
    if (Date.now() - entry.trackingStart < entry.trackingDuration) {
      const duplicateEntries = entriesDone.filter(_ => _.item.itemID === entry.item.itemID && _.currentPrice)[0];

      let currentPrice: number;
      let currentOrder: MarketData;
      if (duplicateEntries) {
        currentPrice = duplicateEntries.currentPrice;
      } else {
        currentOrder = await getCheapestOrder(entry.item.itemID, entry.region.id);
        currentPrice = currentOrder.price;
      }

      if (currentPrice && currentPrice !== entry.trackingPrice) {
        const change = Math.abs(currentPrice - entry.trackingPrice);
        const readableChange = +(Math.round(Number(change.toString() + 'e+' + '2')) + 'e-' + 2);
        if (readableChange >= entry.trackingLimit) {
          await sendChangeMessage(entry.message, currentOrder, entry, change).catch(() => {
            // TODO: Delete entry if it failed to send the message
          });
        }
      }
    } else {
      await entry.message.reply('Tracking duration expired.').catch(() => {
        // TODO: Delete entry if it failed to send the message
      });
    }

    entriesDone.push(entry);
  }
}, 300 * 1000);

async function sendChangeMessage(message: Message, currentOrder: MarketData, entry: TrackingEntry, change: number) {
  const oldPrice = formatNumber(entry.trackingPrice) + ' ISK';
  const newPrice = formatNumber(currentOrder.price) + ' ISK';
  const isWord = pluralize('is', 'are', currentOrder.volume_remain);
  const itemWord = pluralize('item', 'items', currentOrder.volume_remain);
  let plus = '-';
  if (newPrice > oldPrice) {
    plus = '+';
  }

  let tReply = `Attention, price change detected! for ${itemFormat(entry.item.name.en)} in ${regionFormat(entry.region.name)}:`;
  tReply += `The price for ${itemFormat(entry.item.name.en)} ${droppedRose(change)} ${makeCode(`${plus}${change} ISK`)}`;
  tReply += newLine(2);
  tReply += `${makeCode(oldPrice)} to ${makeCode(newPrice)}, change: ${makeCode(`${plus}${change} ISK`)}, `;
  tReply += `There ${isWord} ${makeCode(currentOrder.volume_remain.toString())} ${itemWord} available for this price.`;
  await message.reply(tReply);
}
