/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/naming-convention */
import { IMarketOrdersDataUnit, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';
import { Transaction, startTransaction } from 'elastic-apm-node';
import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { configuration } from '..';
import { debug } from '../debug';
import { getCheapestOrder } from '../helpers/api';
import { items, regions } from '../helpers/cache';
import { getCommand, logSlashCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { getGuessHint, guessItemInput, guessRegionInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, makeBold, makeCode, newLine, regionFormat } from '../helpers/message-formatter';
import { client } from '../market-bot';
import { IParsedMessage } from '../typings.d';

import Timer = NodeJS.Timer;

@Entity('TrackingEntries')
export class TrackingEntry extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public item_id!: number;

    @Column()
    public channel_id!: string;

    @Column()
    public sender_id!: string;

    @Column()
    public region_id!: number;

    @Column({type: 'decimal'})
    public tracking_limit!: number;

    @Column({type: 'decimal'})
    public tracking_price!: number;

    @Column()
    public tracking_type!: 'buy' | 'sell';
}

let trackingCycle: Timer | undefined;

interface ITrackCommandLogicReturn {
    reply: string;
    itemData?: IUniverseNamesDataUnit;
    regionName?: string;
}

export class TrackCommand extends SlashCommand {
    public constructor(
        creator: SlashCreator,
        private commandType: 'buy' | 'sell',
    ) {
        super(creator, {
            // eslint-disable-next-line max-len
            description: `Enable ${commandType} price tracking for an item, you will get notifications of price changes`,
            name: `track-${commandType}-orders`,
            options: [
                {
                    description: 'The item to look up',
                    name: 'item',
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    description: 'The region to track the item price in. Default: The Forge',
                    name: 'region',
                    required: false,
                    type: CommandOptionType.STRING,
                },
                {
                    description: 'The minimum amount the order needs to change for a notification. Default: 1.00 ISK',
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

        const {reply, itemData, regionName} = await trackCommandLogic(context, this.commandType);

        await context.send(reply);
        logSlashCommand(context, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
    }
}

export class ClearTrackingCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            // eslint-disable-next-line max-len
            description: 'Clear all price tracking entries in a channel, optionally for a specific item.',
            name: `track-clear`,
            options: [
                {
                    description: 'The item to clear tracking for',
                    name: 'item',
                    required: false,
                    type: CommandOptionType.STRING,
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

        let reply = `All entries cleared from this channel.`;

        const messageData: IParsedMessage = {
            content: getCommand(context),
            item: '',
            limit: 5,
            region: '',
            system: '',
            ...context.options,
        };

        let itemId: number | undefined;
        let itemData: IGuessReturn | undefined;
        if (messageData.item && messageData.item.length) {
            itemData = await guessItemInput(messageData.item);
            if (itemData.itemData && itemData.itemData.name) {
                itemId = itemData.itemData.id;
            }
        }

        const trackingEntries: TrackingEntry[] = await TrackingEntry.find();
        if (trackingEntries && trackingEntries.length) {
            let entries = trackingEntries.filter((trackingEntry) => trackingEntry.channel_id === context.channelID);
            if (itemId && itemData && itemData.itemData && itemData.itemData.name) {
                reply = `All entries for ${itemFormat(itemData.itemData.name)} cleared from this channel.`;
                entries = entries.filter((entry) => entry.item_id === itemId);
            }

            for (const entry of entries) {
                await entry.remove();
            }
        }

        await context.send(reply);
        logSlashCommand(context, undefined, undefined, transaction);
    }
}

export const startTrackingCycle = () => {
    debug('Scheduled next tracking cycle');
    trackingCycle = setInterval(() => {
        performTrackingCycle().then();
    }, 5 * 60 * 1000);
};

export const stopTrackingCycle = () => {
    if (trackingCycle !== undefined) {
        debug('Stopping tracking cycle');
        clearInterval(trackingCycle);
        trackingCycle = undefined;
    }
};

const trackCommandLogic = async (context: CommandContext, type: 'buy' | 'sell'): Promise<ITrackCommandLogicReturn> => {
    const maxEntries = 3;

    let regionName = '';
    let reply = '';

    const messageData: IParsedMessage = {
        content: getCommand(context),
        item: '',
        limit: 5,
        region: '',
        system: '',
        ...context.options,
    };

    if (!(messageData.item && messageData.item.length)) {
        reply += 'You need to give me an item to track.';
        return {itemData: undefined, regionName, reply};
    }

    const {itemData, guess, id}: IGuessReturn = await guessItemInput(messageData.item);

    reply += getGuessHint({guess, id, itemData}, messageData.item);

    if (!itemData.id) {
        return {itemData: undefined, regionName, reply};
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const defaultRegion = regions.find((region) => region.name === 'The Forge')!;
    let selectedRegion = defaultRegion;

    if (messageData.region) {
        selectedRegion = (await guessRegionInput(messageData.region)).itemData;
        if (!selectedRegion.id) {
            selectedRegion = defaultRegion;
            reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(selectedRegion.name)}`;
            reply += newLine(2);
        }
    }

    regionName = selectedRegion.name;

    let changeLimit = messageData.limit || 1;

    if (changeLimit < 0.01) {
        reply += makeCode('0.01 ISK') + ' is the minimum change amount I can handle.';
        reply += newLine();
        changeLimit = 0.01;
    }

    const trackingEntries: TrackingEntry[] = await TrackingEntry.find();
    const dupEntries = trackingEntries.filter((trackingEntry) => trackingEntry.sender_id === context.user.id);
    if (dupEntries.length >= maxEntries) {
        reply += `You've reached the maximum of ${makeBold(maxEntries)} tracking entries.`;
        return {itemData, regionName, reply};
    }

    const channelItemDup = dupEntries.some((duplicate) =>
        (duplicate.item_id === itemData.id && duplicate.region_id === selectedRegion.id
            && duplicate.tracking_type === type && duplicate.channel_id === context.channelID),
    );
    if (channelItemDup) {
        reply += `I am already tracking the ${type} price for ${itemFormat(itemData.name)} in this channel.`;
        return {itemData, regionName, reply};
    }

    const originalOrder = await getCheapestOrder(type, itemData.id, selectedRegion.id);
    if (!originalOrder) {
        reply += `I couldn't find any ${makeBold(type)} orders for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}.`;
        return {itemData, regionName, reply};
    }

    const originalPrice = originalOrder.price;

    reply += `Started ${makeBold(type)} price tracking for ${itemFormat(itemData.name)} in ${regionFormat(regionName)}, ` +
        `I'll warn you when the ${makeBold(type)} price changes ${makeCode(formatNumber(changeLimit) + ' ISK')}. ` +
        ` Right now the price is ${makeCode(formatNumber(originalPrice) + ' ISK')}`;
    reply += newLine(2);

    const entry = new TrackingEntry();
    entry.channel_id = context.channelID;
    entry.item_id = itemData.id;
    entry.region_id = selectedRegion.id;
    entry.sender_id = context.user.id;
    entry.tracking_limit = changeLimit;
    entry.tracking_price = originalPrice;
    entry.tracking_type = type;
    await entry.save();

    if (trackingCycle === undefined) {
        startTrackingCycle();
    }
    return {itemData, regionName, reply};
};

const droppedRose = (amount: number) => amount < 0 ? 'dropped' : 'rose';

/**
 * The main tracking cycle, it will fetch prices for all items in the TrackingEntries array and send messages.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const performTrackingCycle = async () => {

    debug('Executing tracking cycle');

    const trackingEntries: TrackingEntry[] = await TrackingEntry.find();

    if (!trackingEntries.length) {
        stopTrackingCycle();
        return;
    }

    const entriesDone: Array<{ entry: TrackingEntry; order?: IMarketOrdersDataUnit }> = [];

    for (const entry of trackingEntries) {

        let currentPrice = 0;

        // It is inefficient to fetch prices for the same item/region combo twice, check if the combo exists in duplicateEntries.
        const duplicateEntry = entriesDone.find((entryDone) =>
            (entryDone.entry.item_id === entry.item_id && entryDone.entry.region_id === entry.region_id),
        );

        const currentOrder = (duplicateEntry && duplicateEntry.order) ?
            duplicateEntry.order : await getCheapestOrder(entry.tracking_type, entry.item_id, entry.region_id);

        if (currentOrder) {
            currentPrice = currentOrder.price;
        }

        // Only run if we have a currentPrice and if it is different from the tracking price
        if (currentOrder && currentPrice && currentPrice !== entry.tracking_price) {

            // Calculate the difference between the two values and get the absolute number from it
            const change = currentPrice - entry.tracking_price;
            const changeAbsolute = Math.abs(change);

            // Round the difference to 2 decimals
            const roundedChange = +(Math.round(Number(changeAbsolute.toString() + 'e+' + '2')) + 'e-' + 2);

            if (roundedChange >= entry.tracking_limit) {
                await sendChangeMessage(entry.channel_id, currentOrder, entry, changeAbsolute).then(() => {
                    // Update the tracking_price so we don't notify twice for the same price change
                    entry.tracking_price = currentOrder.price;
                    entry.save().then();
                }).catch((error) => {
                    process.stderr.write(`Cannot send message: \n${error}\n`);
                    entry.remove().then();
                });
            }
        }

        entriesDone.push({
            entry,
            order: currentOrder ? currentOrder : undefined,
        });
    }
};

const sendChangeMessage = async (channelId: string, currentOrder: IMarketOrdersDataUnit, entry: TrackingEntry, change: number) => {
    const oldPrice = formatNumber(entry.tracking_price) + ' ISK';
    const newPrice = formatNumber(currentOrder.price) + ' ISK';
    const isWord = pluralize('is', 'are', currentOrder.volume_remain);
    const itemWord = pluralize('item', 'items', currentOrder.volume_remain);
    const droppedRoseWord = droppedRose(currentOrder.price - entry.tracking_price);
    const changeText = makeCode(`${formatNumber(change)} ISK`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const itemName = items.find((item) => item.id === entry.item_id)!.name;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const regionName = regions.find((region) => region.id === entry.region_id)!.name;

    let reply = `Attention, change detected in ${makeBold(entry.tracking_type)} price `;
    reply += `for ${itemFormat(itemName)} in ${regionFormat(regionName)}: `;
    reply += newLine();
    reply += `The ${makeBold(entry.tracking_type)} price for ${itemFormat(itemName)} ${droppedRoseWord} ${changeText}, `;
    reply += `from ${makeCode(oldPrice)} to ${makeCode(newPrice)}. `;
    reply += newLine();
    reply += `There ${isWord} ${makeCode(currentOrder.volume_remain.toString())} ${itemWord} set at this price.`;
    if (client) {
        await client.sendToChannel(channelId, reply);
    }
};
