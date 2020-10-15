import { sortArrayByObjectProperty } from '@ionaru/array-utils';
import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';

import { Message } from '../chat-service/discord/message';
import { maxMessageLength } from '../chat-service/discord/misc';
import { fetchMarketData, fetchUniverseNames } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { getGuessHint, getSelectedRegion, guessItemInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { IParsedMessage } from '../typings';

interface ISellOrdersCommandLogicReturn {
    reply: string;
    itemData?: IUniverseNamesDataUnit;
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
    reply = regionReply;

    regionName = selectedRegion.name;

    const itemId = itemData.id;

    let sellOrders = await fetchMarketData(itemId, selectedRegion.id, 'sell');

    if (!sellOrders) {
        reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
        return {reply, itemData, regionName};
    }

    if (!(sellOrders && sellOrders.length)) {
        reply += `I couldn't find any sell orders for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}.`;
        return {reply, itemData, regionName};
    }

    sellOrders = sortArrayByObjectProperty(sellOrders, (order) => order.price).slice(0, messageData.limit);

    let locationIds = [];
    for (const order of sellOrders) {
        locationIds.push(order.location_id);
    }

    locationIds = [...new Set(locationIds)];

    let locationNames: IUniverseNamesData = [];
    if (locationIds.length) {
        locationNames = await fetchUniverseNames(locationIds);
    }

    const orderWord = pluralize('order', 'orders', messageData.limit);
    reply += `The cheapest ${itemFormat(itemData.name)} sell ${orderWord} in ${regionFormat(regionName)}:`;
    reply += newLine(2);

    for (const order of sellOrders) {
        const orderPrice = formatNumber(order.price);

        const locationNameData = locationNames.find((locationName) => locationName.id === order.location_id);
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
