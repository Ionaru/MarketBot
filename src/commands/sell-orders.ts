import { sortArrayByObjectProperty } from '@ionaru/array-utils';
import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';
import { startTransaction, Transaction } from 'elastic-apm-node';
import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { maxMessageLength } from '../chat-service/discord/misc';
import { fetchMarketData, fetchUniverseNames } from '../helpers/api';
import { getCommand, logSlashCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { getGuessHint, getSelectedRegion, guessItemInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { IParsedMessage } from '../typings.d';

interface ISellOrdersCommandLogicReturn {
    reply: string;
    itemData?: IUniverseNamesDataUnit;
    regionName?: string;
}

export class SellOrdersCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description: 'List the best sell orders for an item',
            name: 'sell-orders',
            options: [
                {
                    description: 'The item to look up',
                    name: 'item',
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    description: 'The region to search in. Default: The Forge',
                    name: 'region',
                    required: false,
                    type: CommandOptionType.STRING,
                },
                {
                    description: 'The amount of orders to show. Default: 5',
                    name: 'limit',
                    required: false,
                    type: CommandOptionType.NUMBER,
                },
            ],
        });
    }

    public async run(context: CommandContext): Promise<void> {
        // eslint-disable-next-line no-null/no-null
        let transaction: Transaction | null = null;
        if (configuration.getProperty('elastic.enabled') === true) {
            transaction = startTransaction();
        }

        await context.defer(false);

        const messageData: IParsedMessage = {
            content: getCommand(context),
            item: '',
            limit: 5,
            region: '',
            system: '',
            ...context.options,
        };

        const {reply, itemData, regionName} = await sellOrdersCommandLogic(messageData);

        await context.send(reply);
        logSlashCommand(context, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
    }
}

const sellOrdersCommandLogic = async (messageData: IParsedMessage): Promise<ISellOrdersCommandLogicReturn> => {

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

    let sellOrders = await fetchMarketData(itemId, selectedRegion.id, 'sell');

    if (!sellOrders) {
        reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
        return {itemData, regionName, reply};
    }

    if (!(sellOrders && sellOrders.length)) {
        reply += `I couldn't find any sell orders for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}.`;
        return {itemData, regionName, reply};
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
    return {itemData, regionName, reply};
};
