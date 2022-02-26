import { sortArrayByObjectProperty } from '@ionaru/array-utils';
import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';
import { startTransaction, Transaction } from 'elastic-apm-node';
import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { maxMessageLength } from '../chat-service/discord/misc';
import { fetchMarketData, fetchUniverseNames } from '../helpers/api';
import { citadels } from '../helpers/cache';
import { getCommand, logSlashCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { getGuessHint, getSelectedRegion, guessItemInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { IParsedMessage } from '../typings.d';

interface IBuyOrdersCommandLogicReturn {
    reply: string;
    itemData?: IUniverseNamesDataUnit;
    regionName?: string;
}

export class BuyOrdersCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description: 'List the best buy orders for an item',
            guildIDs: ['302014526201659392'],
            name: 'buy-orders',
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

        const {reply, itemData, regionName} = await buyOrdersCommandLogic(messageData);

        await context.send(reply);
        logSlashCommand(context, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
    }
}

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
