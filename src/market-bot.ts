import { regionList } from './regions';
import fetch from 'node-fetch';
import * as Discord from 'discord.js';
import * as jsyaml from 'js-yaml';
import { UniverseApi } from '../swagger/api';
import { MarketData, ParsedMessage, PriceData, SDEObject } from './typings';
import fs = require('fs');
import path = require('path');
import Fuse = require('fuse.js');

export const creator = {name: 'Ionaru', id: '96746840958959616'};
export const playing = {game: {name: 'with ISK (/i for info)'}};

export const universeApi = new UniverseApi();
export const items: Array<SDEObject> = [];

export let client: Discord.Client;
export let fuse: Fuse;
export let token: string;

export const commandPrefix = '/';
export const priceCommand = commandPrefix + 'p';
export const regionCommand = commandPrefix + 'r';
export const limitCommand = commandPrefix + 'l';
export const ordersCommand = commandPrefix + 'c';
export const infoCommand = commandPrefix + 'i';

function activate() {
  console.log('Bot has awoken, loading typeIDs.yaml');
  const yaml = jsyaml.load(fs.readFileSync(path.join(__dirname, '../data/typeIDs.yaml')).toString());
  console.log('File loaded, starting parse cycle');
  for (const key in yaml) {
    if (yaml.hasOwnProperty(key)) {
      const value: SDEObject = yaml[key];
      value.itemID = Number(key);
      items.push(value);
    }
  }

  fuse = new Fuse(items, {
    shouldSort: true,
    threshold: 0.6,
    location: 0,
    distance: 100,
    maxPatternLength: 128,
    tokenize: true,
    minMatchCharLength: 1,
    keys: ['name.en']
  });

  console.log(`Parsing complete, ${items.length} items loaded into memory`);

  token = fs.readFileSync(path.join(__dirname, '../config/token.txt')).toString();

  client = new Discord.Client();
  client.login(token);
  client.once('ready', () => {
    announceReady();
  });
}

function announceReady() {
  client.user.setPresence(playing).then();
  client.on('message', (message: Discord.Message) => {
    processMessage(message).then().catch((error) => {
      console.error(error);
      message.channel.sendMessage(
        `ERROR! Something went wrong, please consult <@${creator.id}>\n`
      ).then();
    });
  });
  console.log('I am online!');
}

async function deactivate() {
  console.log('Quitting!');
  await client.destroy();
  console.log('Done!');
  process.exit(0);
}

function formatISK(amount: number | string, decimals = 2, decimalMark = '.', delimiter = ','): string {
  let i: any, j: any, n: any, s: any;
  n = Number(amount);
  s = n < 0 ? '-' : '';
  i = parseInt(n = Math.abs(+n || 0).toFixed(decimals), 10) + '';
  j = (j = i.length) > 3 ? j % 3 : 0;
  return s + (j ? i.substr(0, j) + delimiter : '') +
    i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + delimiter) +
    (decimals ? decimalMark + Math.abs(n - i).toFixed(decimals).slice(2) : '');
}

async function fetchMarketData(itemId, regionId): Promise<Array<MarketData>> {
  const host = 'https://esi.tech.ccp.is/';
  const path = `v1/markets/${regionId}/orders/?type_id=${itemId}`;
  const url = host + path;

  console.log(url);
  const refreshResponse = await fetch(url);
  return await refreshResponse.json();
}

function pluralize(singular: string, plural: string, amount: number): string {
  if (amount === 1) {
    return singular;
  }
  return plural;
}

async function processMessage(discordMessage: Discord.Message) {
  if (discordMessage.content.match(new RegExp(`^${priceCommand}`, 'i'))) {

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

    if (itemData) {

      let regionId = 10000002;

      if (message.region) {
        regionId = guessUserRegionInput(message.region);
        if (!regionId) {
          reply += `I don't know of the '${message.region}' region, defaulting to **The Forge**\n`;
          regionId = 10000002;
        }
      }

      const regionName = regionList[regionId];

      const itemId = itemData.itemID;

      const json = await fetchItemPrice(itemId, regionId);

      if (json) {

        const sellData: PriceData = json[0]['sell'];
        const buyData: PriceData = json[0]['buy'];

        let sellPrice = 'unknown';
        let lowestSellPrice = 'unknown';
        if (sellData.fivePercent && sellData.fivePercent !== 0) {
          sellPrice = formatISK(sellData.fivePercent) + ' ISK';
          lowestSellPrice = formatISK(sellData.min) + ' ISK';
        }

        let buyPrice = 'unknown';
        let highestBuyPrice = 'unknown';
        if (buyData.fivePercent && buyData.fivePercent !== 0) {
          buyPrice = formatISK(buyData.fivePercent) + ' ISK';
          highestBuyPrice = formatISK(buyData.max) + ' ISK';
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

          replyPlaceholder.edit(reply).then();

        } else {
          replyPlaceholder.edit(
            `I couldn't find any price information for '${itemData.name.en}' in **${regionName}**, sorry.`
          );
        }
      } else {
        replyPlaceholder.edit(
          `My apologies, I was unable to fetch the required data from the web, please try again later.`
        );
      }
    } else {
      await discordMessage.channel.sendMessage(`I don't know what you mean with '${message.item}' 😟`);
    }
  } else if (discordMessage.content.match(new RegExp(`^${ordersCommand}`, 'i'))) {

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
      await discordMessage.channel.sendMessage(`I don't know what you mean with '${message.item}' 😟`);
    }

  } else if (discordMessage.content.match(new RegExp(`^${infoCommand}`, 'i'))) {
    discordMessage.channel.sendMessage('Greetings, I am MarketBot!\n' +
      `I was created by <@${creator.id}> to fetch data from the EVE Online market, ` +
      'all my data currently comes from https://eve-central.com, the EVE Swagger Interface ' +
      'and the Static Data Export provided by CCP.\n\n' +
      'You can access my functions by using these commands:\n\n' +
      `- \`${priceCommand} <item name> [${regionCommand} <region name>]\` ` +
      '- Use this to let me fetch data from the EVE Online market for a given item, ' +
      'by default I use the market in The Forge region (where Jita is).\n\n' +
      `- \`${ordersCommand} <item name> [${regionCommand} <region name>] [${limitCommand} <limit>]\` ` +
      '- When issued with this command, I will search a regional market for the best sell orders available.' +
      '\n**Warning! This does not include Citadels**\n\n' +
      `- \`${infoCommand}\` - Print this information.\n\n` +
      'My code is publicly available on https://github.com/Ionaru/MarketBot').then();
  }
}

function guessUserItemInput(itemString: string): SDEObject {
  // let itemString = itemWords.join(' ');

  let itemData;

  let regex: RegExp;
  let possibilities: Array<SDEObject> = [];
  // for (const _ of itemWords) {
  // Item did not 100% match anything in the item list
  // itemString = itemWords.join(' ');

  // Check in start of the words
  regex = new RegExp(`^${itemString}`, 'i');
  possibilities.push(...items.filter(_ => {
    if (_.name.en) {
      return _.name.en.match(regex);
    }
  }));

  if (!possibilities.length) {
    // Check at end of the words
    regex = new RegExp(`${itemString}$`, 'i');
    possibilities.push(...items.filter(_ => {
      if (_.name.en) {
        return _.name.en.match(regex);
      }
    }));

    if (!possibilities.length) {
      // Check in middle of words
      possibilities.push(...items.filter(_ => {
        if (_.name.en) {
          return _.name.en.toUpperCase().indexOf(itemString.toUpperCase()) !== -1;
        }
      }));
    }
  }

  // Sort by word length
  possibilities = sortArrayByObjectPropertyLength(possibilities, 'name', 'en');

  if (possibilities.length) {
    itemData = possibilities[0];
    // break;
  } else {
    itemData = <SDEObject> fuse.search(itemString)[0];
  }

  return itemData;
}

function guessUserRegionInput(regionString: string): number {
  let foundRegion;

  for (const key in regionList) {
    if (regionList.hasOwnProperty(key)) {
      if (regionList[key].toUpperCase().indexOf(regionString.toUpperCase()) !== -1) {
        foundRegion = key;
        break;
      }
    }
  }
  return foundRegion;
}

async function fetchItemPrice(itemId, regionId) {
  const host = 'https://api.eve-central.com/api/marketstat/json';
  const url = `${host}?typeid=${itemId}&regionlimit=${regionId}`;

  console.log(url);
  const refreshResponse = await
    fetch(url).catch(console.error);
  if (refreshResponse) {
    return await
      refreshResponse.json().catch(console.error);
  }
}

function sortArrayByObjectPropertyLength(array: Array<any>, p1: string, p2: string, inverse = false): Array<any> {
  function compare(a, b) {
    if (a[p1][p2].length < b[p1][p2].length) {
      return inverse ? 1 : -1;
    }
    if (a[p1][p2].length > b[p1][p2].length) {
      return inverse ? -1 : 1;
    }
    return 0;
  }

  return array.sort(compare);
}

function sortArrayByObjectProperty(array: Array<any>, p1: string, inverse = false): Array<any> {
  function compare(a, b) {
    if (a[p1] < b[p1]) {
      return inverse ? 1 : -1;
    }
    if (a[p1] > b[p1]) {
      return inverse ? -1 : 1;
    }
    return 0;
  }

  return array.sort(compare);
}

function parseMessage(message: Discord.Message): ParsedMessage {
  const parsedMessage: ParsedMessage = {
    item: null,
    region: null,
    limit: null,
  };

  // Remove double spaces because that confuses the input guessing system
  const messageText = message.content.replace(/ +(?= )/g, '');

  // Split the message into seperate words and remove the first word (the command tag)
  const messageWords = messageText.split(' ');
  messageWords.shift();

  // Search for the item text
  let itemText = messageWords.join(' ');
  if (itemText.indexOf(commandPrefix) !== -1) {
    itemText = itemText.substring(0, itemText.indexOf(commandPrefix)).trim();
  }
  parsedMessage.item = itemText;

  // Search for the region text
  const regionCommandIndex = messageText.indexOf(regionCommand);
  if (regionCommandIndex !== -1) {
    let sep1 = messageText.substring(regionCommandIndex + regionCommand.length).trim();
    if (sep1.indexOf(commandPrefix) !== -1) {
      sep1 = sep1.substring(0, sep1.indexOf(commandPrefix)).trim();
    }
    parsedMessage.region = sep1;
  }

  // Search for the limit text
  const limitCommandIndex = messageText.indexOf(limitCommand);
  if (limitCommandIndex !== -1) {
    let sep1 = messageText.substring(limitCommandIndex + limitCommand.length).trim();
    if (sep1.indexOf(commandPrefix) !== -1) {
      sep1 = sep1.substring(0, sep1.indexOf(commandPrefix)).trim();
    }
    parsedMessage.limit = Number(sep1);
  }

  return parsedMessage;
}

activate();
process.stdin.resume();
process.on('SIGINT', () => {
  deactivate().then();
});
