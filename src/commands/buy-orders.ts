import { sortArrayByObjectProperty } from '@ionaru/array-utils';
import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';

import { Message } from '../chat-service/discord/message';
import { maxMessageLength } from '../chat-service/discord/misc';
import { fetchMarketData, fetchUniverseNames } from '../helpers/api';
import { citadels } from '../helpers/cache';
import { logCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { getGuessHint, getSelectedRegion, guessItemInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { IParsedMessage } from '../typings.d';

interface IBuyOrdersCommandLogicReturn {
    reply: string;
    itemData?: IUniverseNamesDataUnit;
    regionName?: string;
}

export const buyOrdersCommand = async (message: Message, transaction: any) => {
    const messageData = parseMessage(message.content);

    messageData.limit = messageData.limit || 5;
    const orderWord = pluralize('order', 'orders', messageData.limit);

    const replyPlaceHolder = await message.reply(`Searching for the highest buy ${orderWord}, one moment, ${message.sender}...`);

    const {reply, itemData, regionName} = await buyOrdersCommandLogic(messageData);

    await replyPlaceHolder.edit(reply);
    logCommand('buy-orders', message, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
};

// eslint-disable-next-line sonarjs/cognitive-complexity
const buyOrdersCommandLogic = async (messageData: IParsedMessage): Promise<IBuyOrdersCommandLogicReturn> => {

    let regionName = '';
    let reply = '';

    if (!(messageData.item && messageData.item.length)) {
        reply += 'You need to give me an item to search for.';
        return {itemData: undefined, regionName, reply};
    }

    const {itemData, guess, id}: IGuessReturn = await guessItemInput(messageData.item);

    reply += getGuessHint({guess, id, itemData}, messageData.item);

    if (!itemData.id) {
        return {itemData: undefined, regionName, reply};
    }

    const {selectedRegion, regionReply} = await getSelectedRegion(messageData.region, reply);
    reply = regionReply;

    regionName = selectedRegion.name;

    const itemId = itemData.id;

    let buyOrders = await fetchMarketData(itemId, selectedRegion.id, 'buy');

    if (!buyOrders) {
        reply += 'My apologies, I was unable to fetch the required data from the web, please try again later.';
        return {itemData, regionName, reply};
    }

    if (!(buyOrders && buyOrders.length)) {
        reply += `It seems nobody is buying ${itemFormat(itemData.name)} in ${regionFormat(regionName)}.`;
        return {itemData, regionName, reply};
    }

    buyOrders = sortArrayByObjectProperty(buyOrders, (order) => order.price, true).slice(0, messageData.limit);

    let locationIds = [];
    for (const order of buyOrders) {
        if (order.location_id < 100000000) {
            locationIds.push(order.location_id);
        }
    }

    locationIds = [...new Set(locationIds)];

    let locationNames: IUniverseNamesData = [];
    if (locationIds.length) {
        locationNames = await fetchUniverseNames(locationIds);
    }

    const orderWord = pluralize('order', 'orders', messageData.limit);
    reply += `The highest ${itemFormat(itemData.name)} buy ${orderWord} in ${regionFormat(regionName)}:`;
    reply += newLine(2);

    for (const order of buyOrders) {
        const orderPrice = formatNumber(order.price);
        const location = locationNames.find((locationName) => locationName.id === order.location_id);
        let locationText = `an unknown location with ID ${order.location_id}`;
        if (location) {
            locationText = location.name;
        } else if (order.location_id.toString().length === 13) {
            const citadel = citadels[order.location_id];
            locationText = citadel ? citadel.name : `an unknown citadel in ${regionName}`;
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
        replyAddition += `with ${makeCode(range)} order range from ${makeCode(locationText)}`;
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
    return {itemData, regionName, reply};
};
