import { items } from '../market-bot';
import { regionList } from '../regions';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { MarketData } from '../typings';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatNumber, pluralize } from '../helpers/formatters';
import { Message } from '../chat-service/discord-interface';
import { itemFormat, makeCode, newLine, regionFormat } from '../helpers/message-formatter';

export async function trackFunction(message: Message) {
  let reply = '';

  if (message.isPrivate) {

    const messageData = parseMessage(message.content);

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

        const endpointCacheTime = 300 * 1000; // 300 seconds

        // const warnLimit = messageData.limit || 0.05;

        const timeLimit = 60 * 60 * 1000;

        const endTime = Date.now() + timeLimit;

        let changeLimit = messageData.limit || 1;

        if (changeLimit < 0.01) {
          reply += '0.01 ISK is the minimum change amount I can handle.';
          reply += newLine();
          changeLimit = 0.01;
        }

        const originalMarketData = await fetchMarketData(itemId, regionId);

        if (originalMarketData) {
          const OsellOrders = originalMarketData.filter(_ => _.is_buy_order === false);
          if (OsellOrders && OsellOrders.length) {
            const OsellOrdersSorted: Array<MarketData> = sortArrayByObjectProperty(OsellOrders, 'price');
            const OcheapestOrder = OsellOrdersSorted[0];
            let Oprice = OcheapestOrder.price;

            reply += `Starting price tracking for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}, ` +
              `I'll warn you when the price changes ${makeCode(formatNumber(changeLimit) + 'ISK')} ` +
              `, right now the price is ${makeCode(formatNumber(Oprice) + 'ISK')}`;
            const interval = setInterval(async () => {
              const marketData = await fetchMarketData(itemId, regionId);
              if (marketData) {
                const sellOrders = marketData.filter(_ => _.is_buy_order === false);
                if (sellOrders && sellOrders.length) {
                  const sellOrdersSorted: Array<MarketData> = sortArrayByObjectProperty(sellOrders, 'price');
                  const cheapestOrder = sellOrdersSorted[0];
                  const price = cheapestOrder.price;
                  if (price !== Oprice) {
                    const changeIsk = Math.abs(price - Oprice);
                    const b = +(Math.round(Number(changeIsk.toString() + 'e+' + '2')) + 'e-' + 2);
                    console.log('change:', changeIsk, b);
                    if (b >= changeLimit) {
                      // const change = formatNumber(((price - Oprice) / Oprice) * 100, 10);
                      const oldPrice = formatNumber(Oprice) + ' ISK';
                      const newPrice = formatNumber(price) + ' ISK';
                      const isWord = pluralize('is', 'are', cheapestOrder.volume_remain);
                      const itemWord = pluralize('item', 'items', cheapestOrder.volume_remain);
                      let plus = '-';
                      if (newPrice > oldPrice) {
                        plus = '+';
                      }

                      let tReply = `Attention, price change detected for ${itemFormat(itemData.name.en)} in ${regionFormat(regionName)}:`;
                      tReply += newLine(2);
                      tReply += `${makeCode(oldPrice)} to ${makeCode(newPrice)}, change: ${makeCode(`${plus}${b} ISK`)}, `;
                      tReply += `There ${isWord} ${makeCode(cheapestOrder.volume_remain.toString())} ${itemWord} available for this price.`;
                      await message.reply(tReply);
                      Oprice = price;
                    }
                    // clearInterval(interval);
                  }
                }
              }
              if (endTime <= Date.now()) {
                await message.reply('Tracking duration expired.');
                clearInterval(interval);
              }

            }, endpointCacheTime);
          }
        } else {
          reply += 'My apologies, I was unable to fetch the required data from the web, please try again later.';
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
