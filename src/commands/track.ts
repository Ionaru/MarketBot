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

        const timeLimit = 24 * 60 * 60 * 1000;

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

        } else {
          reply += `I couldn't find any sell orders for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}.`;
        }
      } else {
        reply = `I don't know what you mean with "${messageData.item}" 😟`;
      }
    } else {
      reply = 'You need to give me an item to track.';
    }
  } else {
    reply = 'Please send me a private message to have me track an item price for you.';
  }
  // await replyPlaceholder.edit(reply);
  // logCommand('orders', discordMessage, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
  await message.reply(reply);
}

function droppedRose(amount) {
  if (amount < 0) {
    return 'dropped';
  }
  return 'rose';
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

/*
* The main tracking cycle, it will fetch prices for all items in the TrackingEntries array
* */
setInterval(async () => {
  const entriesDone: Array<TrackingEntry> = [];

  const trackingCycleEntries = trackingEntries.slice();
  for (const entry of trackingCycleEntries) {
    if (Date.now() - entry.trackingStart < entry.trackingDuration) {
      const duplicateEntries = entriesDone.filter(_ => _.item.itemID === entry.item.itemID && _.currentPrice)[0];

      let currentPrice: number;
      let currentOrder: MarketData;
      if (duplicateEntries) {
        currentPrice = duplicateEntries.currentPrice;
      } else {
        currentOrder = await getCheapestOrder(entry.item.itemID, entry.region.id).catch(() => {
          return null;
        });
        if (currentOrder) {
          currentPrice = currentOrder.price;
        }
      }

      if (currentPrice && currentPrice !== entry.trackingPrice) {
        const change = Math.abs(currentPrice - entry.trackingPrice);
        const readableChange = +(Math.round(Number(change.toString() + 'e+' + '2')) + 'e-' + 2);
        if (readableChange >= entry.trackingLimit) {
          await sendChangeMessage(entry.message, currentOrder, entry, change).then(() => {
            trackingEntries[trackingEntries.indexOf(entry)].trackingPrice = currentOrder.price;
            trackingEntries[trackingEntries.indexOf(entry)].currentPrice = currentOrder.price;
          }).catch(() => {
            trackingEntries.splice(trackingEntries.indexOf(entry), 1);
          });
        }
      }
    } else {
      await entry.message.reply('Tracking duration expired.').catch(() => {});
      trackingEntries.splice(trackingEntries.indexOf(entry), 1);
    }

    entriesDone.push(entry);
  }
}, 300 * 1000); // 5 minutes

async function sendChangeMessage(message: Message, currentOrder: MarketData, entry: TrackingEntry, change: number) {
  const oldPrice = formatNumber(entry.trackingPrice) + ' ISK';
  const newPrice = formatNumber(currentOrder.price) + ' ISK';
  const isWord = pluralize('is', 'are', currentOrder.volume_remain);
  const itemWord = pluralize('item', 'items', currentOrder.volume_remain);
  const droppedRoseWord = droppedRose(entry.trackingPrice - currentOrder.price);
  const changeText = makeCode(`${formatNumber(change)} ISK`);

  let tReply = `Attention, price change detected for ${itemFormat(entry.item.name.en)} in ${regionFormat(entry.region.name)}: `;
  tReply += newLine();
  tReply += `The price for ${itemFormat(entry.item.name.en)} ${droppedRoseWord} ${changeText}, `;
  tReply += `from ${makeCode(oldPrice)} to ${makeCode(newPrice)}. `;
  tReply += newLine();
  tReply += `There ${isWord} ${makeCode(currentOrder.volume_remain.toString())} ${itemWord} available for this price.`;
  await message.reply(tReply);
}
