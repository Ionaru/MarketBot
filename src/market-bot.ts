import { regionList } from './regions';
import fetch from 'node-fetch';
import fs = require('fs');
import path = require('path');
import * as Discord from 'discord.js';
import * as jsyaml from 'js-yaml';
import { UniverseApi } from '../swagger/api';
import Fuse = require('fuse.js');
import { FuseOptions } from 'fuse.js';
import { MarketData, ParsedMessage, PriceData, SDEObject } from './typings';

class MarketBot {

    creator = 'Ionaru Otsada';
    playing = {game: {name: 'with ISK (/i for info)'}};

    client: Discord.Client;
    token: string;
    items: Array<SDEObject> = [];
    fuse: Fuse;
    universeApi: UniverseApi;

    commandPrefix = '/';
    priceCommand = this.commandPrefix + 'p';
    regionCommand = this.commandPrefix + 'r';
    limitCommand = this.commandPrefix + 'l';
    ordersCommand = this.commandPrefix + 'c';
    infoCommand = this.commandPrefix + 'i';

    constructor() {
        this.universeApi = new UniverseApi();

        console.log('Bot has awoken, loading typeIDs.yaml');
        const yaml = jsyaml.load(fs.readFileSync(path.join(__dirname, '../data/typeIDs.yaml')).toString());
        console.log('File loaded, starting parse cycle');
        for (const key in yaml) {
            if (yaml.hasOwnProperty(key)) {
                const value: SDEObject = yaml[key];
                value.itemID = Number(key);
                this.items.push(value);
            }
        }

        const fuseOptions: FuseOptions = {
            shouldSort: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 128,
            tokenize: true,
            minMatchCharLength: 1,
            keys: ['name.en']
        };

        this.fuse = new Fuse(this.items, fuseOptions);

        console.log(`Parsing complete, ${this.items.length} items loaded into memory`);

        this.token = fs.readFileSync(path.join(__dirname, '../config/token.txt')).toString();

        this.client = new Discord.Client();
        this.client.login(this.token);
        this.client.once('ready', () => {
            this.announceReady();
        });
    }

    private announceReady() {
        this.client.user.setPresence(this.playing).then();
        this.client.on('message', (message: Discord.Message) => {
            this.processMessage(message).then().catch(async (error) => {
                console.error(error);
                await message.channel.sendMessage('ERROR! Something went wrong, please consult Ionaru Otsada');
            });
        });
        console.log('I am online!');
    }

    public async deactivate() {
        console.log('Quitting!');
        await this.client.destroy();
        console.log('Done!');
        process.exit(0);
    }

    private async processMessage(discordMessage: Discord.Message) {
        if (discordMessage.content.match(new RegExp(`^${this.priceCommand}`, 'i'))) {

            const message = this.parseMessage(discordMessage);

            const replyPlaceholder = <Discord.Message> await discordMessage.channel.sendMessage(
                `Checking price, one moment, ${discordMessage.author.username}...`);

            let reply = '';

            let itemData = this.items.filter(_ => {
                if (_.name.en) {
                    return _.name.en.toUpperCase() === message.item.toUpperCase();
                }
            })[0];
            if (!itemData) {
                itemData = this.guessUserItemInput(message.item);
                if (itemData) {
                    reply += `'${message.item}' didn't directly match any item I know of, my best guess is ${itemData.name.en}\n`;
                }
            }

            if (itemData) {

                let regionId = 10000002;

                if (message.region) {
                    regionId = this.guessUserRegionInput(message.region);
                    if (!regionId) {
                        reply += `I don't know of the '${message.region}' region, defaulting to The Forge\n`;
                        regionId = 10000002;
                    }
                }

                const regionName = regionList[regionId];

                const itemId = itemData.itemID;

                const json = await this.fetchItemPrice(itemId, regionId);

                if (json) {

                    const sellData: PriceData = json[0]['sell'];
                    const buyData: PriceData = json[0]['buy'];

                    let sellPrice = 'unknown';
                    let lowestSellPrice = 'unknown';
                    if (sellData.fivePercent && sellData.fivePercent !== 0) {
                        sellPrice = this.formatISK(sellData.fivePercent) + ' ISK';
                        lowestSellPrice = this.formatISK(sellData.min) + ' ISK';
                    }

                    let buyPrice = 'unknown';
                    let highestBuyPrice = 'unknown';
                    if (buyData.fivePercent && buyData.fivePercent !== 0) {
                        buyPrice = this.formatISK(buyData.fivePercent) + ' ISK';
                        highestBuyPrice = this.formatISK(buyData.max) + ' ISK';
                    }

                    if (sellPrice !== 'unknown' || buyPrice !== 'unknown') {
                        reply += `Price information for '${itemData.name.en}' in **${regionName}**:\n\n`;

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
        } else if (discordMessage.content.match(new RegExp(`^${this.ordersCommand}`, 'i'))) {

            const message = this.parseMessage(discordMessage);

            const replyPlaceHolder = <Discord.Message> await discordMessage.channel.sendMessage(
                `Searching for the cheapest orders, one moment, ${discordMessage.author.username}...`);

            let reply = '';

            let itemData = this.items.filter(_ => {
                if (_.name.en) {
                    return _.name.en.toUpperCase() === message.item.toUpperCase();
                }
            })[0];

            if (!itemData) {
                itemData = this.guessUserItemInput(message.item);
                if (itemData) {
                    reply += `'${message.item}' didn't directly match any item I know of, my best guess is \`${itemData.name.en}\`\n`;
                    reply += '*Guessing words is really difficult for bots like me, ' +
                        'please try to spell the words as accurate as possible.*\n\n';
                }
            }

            if (itemData) {

                let regionId = 10000002;

                if (message.region) {
                    regionId = this.guessUserRegionInput(message.region);
                    if (!regionId) {
                        reply += `I don't know of the '${message.region}' region, defaulting to The Forge\n`;
                        regionId = 10000002;
                    }
                }

                const regionName = regionList[regionId];

                const itemId = itemData.itemID;

                const marketData = await this.fetchMarketData(itemId, regionId).then();

                const sellOrders = marketData.filter(_ => _.is_buy_order === false);

                if (sellOrders.length) {

                    const sellOrdersSorted: Array<MarketData> = this.sortArrayByObjectProperty(sellOrders, 'price');

                    const cheapestOrder = sellOrdersSorted[0];
                    const price = cheapestOrder.price;

                    let locationIds = [];
                    for (const order of sellOrdersSorted) {
                        locationIds.push(order.location_id);
                    }

                    locationIds = [...new Set(locationIds)];

                    const nameData = await this.universeApi.postUniverseNames(locationIds);
                    const locationNames = nameData.body;

                    reply += `The cheapest \`${itemData.name.en}\` orders in **${regionName}**:\n\n`;

                    const limit = message.limit || 5;
                    let iter = 0;
                    for (const order of sellOrdersSorted) {
                        const orderPrice = this.formatISK(order.price);
                        const locationName = locationNames.filter(_ => _.id === order.location_id)[0].name;
                        const volume = order.volume_remain;
                        const itemWord = this.pluralize('item', 'items', volume);

                        reply += `\`${orderPrice} ISK\` at \`${locationName}\`, \`${volume}\` ${itemWord} left.\n`;

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

        } else if (discordMessage.content.match(new RegExp(`^${this.infoCommand}`, 'i'))) {
            discordMessage.channel.sendMessage('Greetings, I am MarketBot!\n' +
                'I was created by Ionaru Otsada to fetch data from the EVE Online market, ' +
                'all my data currently comes from https://eve-central.com, the EVE Swagger Interface ' +
                'and the Static Data Export provided by CCP.\n\n' +
                'You can access my functions by using these commands:\n\n' +
                `- \`${this.priceCommand} <item-name> [${this.regionCommand} <region-name>]\` ` +
                '- Use this to let me fetch data from the EVE Online market for a given item, ' +
                'by default I use the market in The Forge region (where Jita is).\n\n' +
                `- \`${this.ordersCommand} <item-name> [${this.regionCommand} <region-name>] [${this.limitCommand} <limit>]\` ` +
                '- When issued with this command, I will search a regional market for the best sell orders available.' +
                '\n**Warning! This does not include Citadels**\n\n' +
                `- \`${this.infoCommand}\` - Print this information.`).then();
        }
    }

    private pluralize(singular: string, plural: string, amount: number): string {
        if (amount === 1) {
            return singular;
        }
        return plural;
    }

    private guessUserItemInput(itemString: string): SDEObject {
        // let itemString = itemWords.join(' ');

        let itemData;

        let regex: RegExp;
        let possibilities: Array<SDEObject> = [];
        // for (const _ of itemWords) {
        // Item did not 100% match anything in the item list
        // itemString = itemWords.join(' ');

        // Check in start of the words
        regex = new RegExp(`^${itemString}`, 'i');
        possibilities.push(...this.items.filter(_ => {
            if (_.name.en) {
                return _.name.en.match(regex);
            }
        }));

        if (!possibilities.length) {
            // Check at end of the words
            regex = new RegExp(`${itemString}$`, 'i');
            possibilities.push(...this.items.filter(_ => {
                if (_.name.en) {
                    return _.name.en.match(regex);
                }
            }));

            if (!possibilities.length) {
                // Check in middle of words
                possibilities.push(...this.items.filter(_ => {
                    if (_.name.en) {
                        return _.name.en.toUpperCase().indexOf(itemString.toUpperCase()) !== -1;
                    }
                }));
            }
        }

        // Sort by word length
        possibilities = this.sortArrayByObjectPropertyLength(possibilities, 'name', 'en');

        if (possibilities.length) {
            itemData = possibilities[0];
            // break;
        } else {
            itemData = <SDEObject> this.fuse.search(itemString)[0];
        }

        return itemData;
    }

    private guessUserRegionInput(regionString: string): number {
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

    private async fetchItemPrice(itemId, regionId) {
        const host = 'https://api.eve-central.com/api/marketstat/json';
        const url = `${host}?typeid=${itemId}&regionlimit=${regionId}`;

        console.log(url);
        const refreshResponse = await fetch(url).catch(console.error);
        if (refreshResponse) {
            return await refreshResponse.json().catch(console.error);
        }
    }

    private async fetchMarketData(itemId, regionId): Promise<Array<MarketData>> {
        const host = 'https://esi.tech.ccp.is/';
        const path = `v1/markets/${regionId}/orders/?type_id=${itemId}`;
        const url = host + path;

        console.log(url);
        const refreshResponse = await fetch(url);
        return await refreshResponse.json();
    }

    private formatISK(amount: number | string, decimals = 2, decimalMark = '.', delimiter = ','): string {
        let i: any, j: any, n: any, s: any;
        n = Number(amount);
        s = n < 0 ? '-' : '';
        i = parseInt(n = Math.abs(+n || 0).toFixed(decimals), 10) + '';
        j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + delimiter : '') +
            i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + delimiter) +
            (decimals ? decimalMark + Math.abs(n - i).toFixed(decimals).slice(2) : '');
    }

    private sortArrayByObjectPropertyLength(array: Array<any>, p1: string, p2: string, inverse = false): Array<any> {
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

    private sortArrayByObjectProperty(array: Array<any>, p1: string, inverse = false): Array<any> {
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

    private parseMessage(message: Discord.Message): ParsedMessage {
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
        if (itemText.indexOf(this.commandPrefix) !== -1) {
            itemText = itemText.substring(0, itemText.indexOf(this.commandPrefix)).trim();
        }
        parsedMessage.item = itemText;

        // Search for the region text
        const regionCommandIndex = messageText.indexOf(this.regionCommand);
        if (regionCommandIndex !== -1) {
            let sep1 = messageText.substring(regionCommandIndex + this.regionCommand.length).trim();
            if (sep1.indexOf(this.commandPrefix) !== -1) {
                sep1 = sep1.substring(0, sep1.indexOf(this.commandPrefix)).trim();
            }
            parsedMessage.region = sep1;
        }

        // Search for the limit text
        const limitCommandIndex = messageText.indexOf(this.limitCommand);
        if (limitCommandIndex !== -1) {
            let sep1 = messageText.substring(limitCommandIndex + this.limitCommand.length).trim();
            if (sep1.indexOf(this.commandPrefix) !== -1) {
                sep1 = sep1.substring(0, sep1.indexOf(this.commandPrefix)).trim();
            }
            parsedMessage.limit = Number(sep1);
        }

        return parsedMessage;
    }
}

const marketBot = new MarketBot();

process.stdin.resume();
process.on('SIGINT', async () => {
    await marketBot.deactivate();
});
