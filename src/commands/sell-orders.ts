import { formatNumber } from '@ionaru/format-number';

import { Message } from '../chat-service/discord/message';
import { maxMessageLength } from '../chat-service/discord/misc';
import { fetchMarketData, fetchUniverseNames } from '../helpers/api';
import { sortArrayByObjectProperty } from '../helpers/arrays';
import { regions } from '../helpers/cache';
import { logCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { getGuessHint, guessItemInput, guessRegionInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { IMarketData, INamesData, IParsedMessage } from '../typings';

interface ISellOrdersCommandLogicReturn {
    reply: string;
    itemData?: INamesData;
    regionName?: string;
}

export async function sellOrdersCommand(message: Message, transaction: any) {
    const messageData = parseMessage(message.content);

    messageData.limit = messageData.limit || 5;
    const orderWord = pluralize('order', 'orders', messageData.limit);

    const replyPlaceHolder = await message.reply(`Searching for the cheapest sell ${orderWord}, one moment, ${message.sender}...`);

    const {reply, itemData, regionName} = await sellOrdersCommandLogic(messageData);

    await replyPlaceHolder.edit(reply);
    logCommand('sell-orders', message, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
}

async function getSelectedRegion(input: string, reply: string) {
    const defaultRegion = regions.filter((region) => region.name === 'The Forge')[0];
    let selectedRegion = defaultRegion;

    if (input) {
        selectedRegion = (await guessRegionInput(input)).itemData;
        if (!selectedRegion.id) {
            selectedRegion = defaultRegion;
            reply += `I don't know of the "${input}" region, defaulting to ${regionFormat(selectedRegion.name)}`;
            reply += newLine(2);
        }
    }

    return {selectedRegion, regionReply: reply};
}

async function sellOrdersCommandLogic(messageData: IParsedMessage): Promise<ISellOrdersCommandLogicReturn> {

    let regionName = '';
    let reply = '';

    if (!(messageData.item && messageData.item.length)) {
        reply += 'You need to give me an item to search for.';
        return {reply, itemData: undefined, regionName};
    }

    const {itemData, guess, id}: IGuessReturn = await guessItemInput(messageData.item);

    reply += getGuessHint({itemData, guess, id}, messageData.item);

    if (!itemData.id) {
        return {reply, itemData: undefined, regionName};
    }

    const {selectedRegion, regionReply} = await getSelectedRegion(messageData.region, reply);
    reply += regionReply;

    regionName = selectedRegion.name;

    const itemId = itemData.id;

    const marketData = await fetchMarketData(itemId, selectedRegion.id);

    if (!marketData) {
        reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
        return {reply, itemData, regionName};
    }

    let sellOrders: IMarketData[] = marketData.filter((order) => order.is_buy_order === false);

    if (!(sellOrders && sellOrders.length)) {
        reply += `I couldn't find any sell orders for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}.`;
        return {reply, itemData, regionName};
    }

    sellOrders = sortArrayByObjectProperty(sellOrders, 'price').slice(0, messageData.limit);

    let locationIds = [];
    for (const order of sellOrders) {
        locationIds.push(order.location_id);
    }

    locationIds = [...new Set(locationIds)];

    let locationNames: INamesData[] = [];
    if (locationIds.length) {
        locationNames = await fetchUniverseNames(locationIds);
    }

    const orderWord = pluralize('order', 'orders', messageData.limit);
    reply += `The cheapest ${itemFormat(itemData.name)} sell ${orderWord} in ${regionFormat(regionName)}:`;
    reply += newLine(2);

    for (const order of sellOrders) {
        const orderPrice = formatNumber(order.price);

        const locationNameData = locationNames.filter((locationName) => locationName.id === order.location_id)[0];
        const locationText = locationNameData ? locationNameData.name : `an unknown location with ID ${order.location_id}`;

        const volume = formatNumber(order.volume_remain, 0);
        const itemWord = pluralize('item', 'items', order.volume_remain);

        let replyAddition = `${makeCode(orderPrice + ' ISK')} at ${makeCode(locationText)}, ${makeCode(volume)} ${itemWord} left.`;
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
    }
    return {reply, itemData, regionName};
}
