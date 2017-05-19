import * as Discord from 'discord.js';
import { items } from '../market-bot';
import { regionList } from '../regions';
import { parseMessage } from '../helpers/parsers';
import { guessUserItemInput, guessUserRegionInput } from '../helpers/guessers';
import { fetchMarketData } from '../helpers/api';
import { MarketData } from '../typings';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { formatNumber, pluralize } from '../helpers/formatters';

export async function trackFunction(discordMessage: Discord.Message) {
  let reply = '';

  if (discordMessage.channel.type === 'dm') {

    const message = parseMessage(discordMessage);

    // const replyPlaceholder = <Discord.Message> await discordMessage.channel.send(
    //   `Checking price, one moment, ${discordMessage.author.username}...`
    // );

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
          //     'please try to spell the words as accurate as possible.*\n';
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

        const endpointCacheTime = 300 * 1000; // 300 seconds

        const warnLimit = message.limit || 0.05;

        const timeLimit = 60 * 60 * 1000;

        const endTime = Date.now() + timeLimit;

        let changeLimit = message.limit || 1;

        if (changeLimit < 0.01) {
          reply += '0.01 ISK is the minimum change amount I can handle.\n\n';
          changeLimit = 0.01;
        }

        const originalMarketData = await fetchMarketData(itemId, regionId);

        // const json = await fetchItemPrice(itemId, regionId);

        if (originalMarketData) {
          const OsellOrders = originalMarketData.filter(_ => _.is_buy_order === false);
          if (OsellOrders && OsellOrders.length) {
            const OsellOrdersSorted: Array<MarketData> = sortArrayByObjectProperty(OsellOrders, 'price');
            const OcheapestOrder = OsellOrdersSorted[0];
            let Oprice = OcheapestOrder.price;
            const originalPrice = Oprice;
            const breakingPrice = Oprice - (Oprice * warnLimit);

            reply += `Starting price tracking for \`${itemData.name.en}\` in **${regionName}**, ` +
              `I'll warn you when the price changes \`${formatNumber(changeLimit)} ISK\` from \`${formatNumber(Oprice)} ISK\``;
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
                    const b = +(Math.round(Number(changeIsk.toString() + 'e+' + '2'))  + 'e-' + 2);
                    console.log('change:', changeIsk, b);
                    if (b >= changeLimit) {
                      // const change = formatNumber(((price - Oprice) / Oprice) * 100, 10);
                      const oldPrice = formatNumber(Oprice) + ' ISK';
                      const newPrice = formatNumber(price) + ' ISK';
                      const isWord = pluralize('is', 'are', cheapestOrder.volume_remain);
                      const itemWord = pluralize('item', 'items', cheapestOrder.volume_remain);
                      let plus = '';
                      if (newPrice > oldPrice) {
                        plus = '+';
                      }
                      await discordMessage.author.send(
                        `Attention, price change detected for \`${itemData.name.en}\` in **${regionName}**:\n\n` +
                        `\`${oldPrice}\` 🡺 \`${newPrice}\`, change: \`${plus}${b} ISK\`, ` +
                        `There ${isWord} \`${cheapestOrder.volume_remain}\` ${itemWord} available for this price.`);
                      Oprice = price;
                    }
                    // clearInterval(interval);
                  }
                }
              }
              if (endTime <= Date.now()) {
                await discordMessage.author.send('');
                clearInterval(interval);
              }

            }, endpointCacheTime);
          }

          //
          //   const sellData: PriceData = json[0]['sell'];
          //   const buyData: PriceData = json[0]['buy'];
          //
          //   let sellPrice = 'unknown';
          //   let lowestSellPrice = 'unknown';
          //   if (sellData.fivePercent && sellData.fivePercent !== 0) {
          //     sellPrice = formatNumber(sellData.fivePercent) + ' ISK';
          //     lowestSellPrice = formatNumber(sellData.min) + ' ISK';
          //   }
          //
          //   let buyPrice = 'unknown';
          //   let highestBuyPrice = 'unknown';
          //   if (buyData.fivePercent && buyData.fivePercent !== 0) {
          //     buyPrice = formatNumber(buyData.fivePercent) + ' ISK';
          //     highestBuyPrice = formatNumber(buyData.max) + ' ISK';
          //   }
          //
          //   if (sellPrice !== 'unknown' || buyPrice !== 'unknown') {
          //     reply += `Price information for \`${itemData.name.en}\` in **${regionName}**:\n\n`;
          //
          //     if (sellPrice !== 'unknown') {
          //       reply += `🡺 Lowest selling price is \`${lowestSellPrice}\`\n`;
          //       reply += `🡺 Average selling price is \`${sellPrice}\`\n`;
          //     } else {
          //       reply += '🡺 Selling price data is unavailable\n';
          //     }
          //
          //     reply += '\n';
          //     if (buyPrice !== 'unknown') {
          //       reply += `🡺 Highest buying price is \`${highestBuyPrice}\`\n`;
          //       reply += `🡺 Average buying price is \`${buyPrice}\`\n`;
          //     } else {
          //       reply += '🡺 Buying price data is unavailable\n';
          //     }
          //
          //   } else {
          //     reply += `I couldn't find any price information for \`${itemData.name.en}\` in **${regionName}**, sorry.`;
          //   }
        } else {
          reply += 'My apologies, I was unable to fetch the required data from the web, please try again later.';
        }
      } else {
        reply = `I don't know what you mean with "${message.item}" 😟`;
      }
    } else {
      reply = 'You need to give me an item to search for.';
    }
    // await replyPlaceholder.edit(reply);
    // logCommand('orders', discordMessage, (itemData ? itemData.name.en : null), (regionName ? regionName : null));
  } else {
    reply = 'Please use Direct Message to have me track an item price for you.';
  }
  await discordMessage.author.send(reply);
}
