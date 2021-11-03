import { formatNumber } from '@ionaru/format-number';

import { TrackingEntry } from '../commands/track';
import { items } from '../helpers/cache';
import { makeBold, makeCode, newLine } from '../helpers/message-formatter';
import { createCommandRegex } from '../helpers/regex';

import { Command } from './command';

export class TrackListCommand extends Command {

    public static readonly debug = Command.debug.extend('track-list');

    private static readonly commands = [
        'track-list', 'tl',
    ];

    private static readonly commandRegex = createCommandRegex(TrackListCommand.commands, true);

    protected readonly initialReply = `Fetching tracking information, one moment, ${this.message.sender}...`;
    protected readonly commandName = TrackListCommand.commands[0];

    public static test(command: string) {
        TrackListCommand.debug(`Testing ${command}`);
        return TrackListCommand.commandRegex.test(command);
    }

    protected async isCommandValid() {
        return true;
    }

    protected async processCommand() {
        const trackingEntries: TrackingEntry[] = await TrackingEntry.createQueryBuilder('trackingEntry')
            .select('trackingEntry')
            .where('trackingEntry.sender_id = :sender', {sender: this.message.author.id})
            .getMany();

        if (!trackingEntries.length) {
            this.embed.addField('Your tracking orders:', 'You have no orders that are currently being tracked.');
            return;
        }

        this.embed.setTitle('Your tracking orders:');

        for (const entry of trackingEntries) {

            let entryText = '';

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const trackingItem = items.find((item) => item.id === entry.item_id)!;

            entryText += `• ${makeBold('Type')}: ${entry.tracking_type}`;
            entryText += newLine();

            entryText += `• ${makeBold('Channel')}: ${this.message.channel.id === entry.channel_id ? 'This channel' : 'Another channel'}`;
            entryText += newLine();

            entryText += `• ${makeBold('User')}: ${this.message.author.id === entry.sender_id ? this.message.author.name : 'Another user'}`;
            entryText += newLine();

            const limit = makeCode(`${formatNumber(entry.tracking_limit)} ISK`);
            entryText += `• ${makeBold('Limit')}: ${limit}`;
            entryText += newLine();

            const currentPrice = makeCode(`${formatNumber(entry.tracking_price)} ISK`);
            entryText += `• ${makeBold('Current price')}: ${currentPrice}`;

            this.embed.addField(`Tracking order: ${makeBold(trackingItem.name)}`, entryText);
        }
    }
}
