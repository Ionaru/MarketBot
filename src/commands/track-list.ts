import { formatNumber } from '@ionaru/format-number';
import { MessageEmbed } from 'discord.js';
import { Transaction, startTransaction } from 'elastic-apm-node';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { items } from '../helpers/cache';
import { logSlashCommand } from '../helpers/command-logger';
import { makeBold, makeCode, newLine } from '../helpers/message-formatter';

import { TrackingEntry } from './track';

export class TrackListCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description: 'List all the orders that MarketBot is tracking for the user that sends to command.',
            guildIDs: ['302014526201659392'],
            name: 'track-list',
        });
    }

    public async run(context: CommandContext): Promise<void> {
        // eslint-disable-next-line no-null/no-null
        let transaction: Transaction | null = null;
        if (configuration.getProperty('elastic.enabled') === true) {
            transaction = startTransaction();
        }

        await context.defer(false);

        const embed = await trackListCommandLogic(context);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await context.send({ embeds: [embed] });
        logSlashCommand(context, undefined, undefined, transaction);
    }
}

const trackListCommandLogic = async ({ channelID, user }: CommandContext) => {
    const trackingEntries: TrackingEntry[] = await TrackingEntry.createQueryBuilder('trackingEntry')
        .select('trackingEntry')
        .where('trackingEntry.sender_id = :sender', { sender: user.id })
        .getMany();

    const embed = new MessageEmbed();

    if (!trackingEntries.length) {
        embed.addField('Your tracking orders:', 'You have no orders that are currently being tracked.');
        return embed;
    }

    embed.setTitle('Your tracking orders:');

    for (const entry of trackingEntries) {

        let entryText = '';

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const trackingItem = items.find((item) => item.id === entry.item_id)!;

        entryText += `• ${makeBold('Type')}: ${entry.tracking_type}`;
        entryText += newLine();

        entryText += `• ${makeBold('Channel')}: ${channelID === entry.channel_id ? 'This channel' : 'Another channel'}`;
        entryText += newLine();

        entryText += `• ${makeBold('User')}: ${user.id === entry.sender_id ? user.username : 'Another user'}`;
        entryText += newLine();

        const limit = makeCode(`${formatNumber(entry.tracking_limit)} ISK`);
        entryText += `• ${makeBold('Limit')}: ${limit}`;
        entryText += newLine();

        const currentPrice = makeCode(`${formatNumber(entry.tracking_price)} ISK`);
        entryText += `• ${makeBold('Current price')}: ${currentPrice}`;

        embed.addField(`Tracking order: ${makeBold(trackingItem.name)}`, entryText);
    }

    return embed;
};
