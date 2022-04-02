import countdown from 'countdown';
import { Transaction, startTransaction } from 'elastic-apm-node';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { debug } from '../debug';
import { LogEntry, logSlashCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { itemFormat, makeBold, makeCode, newLine } from '../helpers/message-formatter';
import { client } from '../market-bot';

import { TrackingEntry } from './track';

export class DataCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description: 'Show statistics that the bot has gathered while in use.',
            name: 'data',
        });
    }

    public async run(context: CommandContext): Promise<void> {
        // eslint-disable-next-line no-null/no-null
        let transaction: Transaction | null = null;
        if (configuration.getProperty('elastic.enabled') === true) {
            transaction = startTransaction();
        }

        await context.defer(false);

        const reply = await dataCommandLogic();

        await context.send(reply);
        logSlashCommand(context, undefined, undefined, transaction);
    }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
const dataCommandLogic = async () => {
    const topItemOutput = await LogEntry.createQueryBuilder()
        .select('COUNT(`item_output`)', 'count')
        .addSelect('item_output')
        .groupBy('item_output')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany();

    const topCommands = await LogEntry.createQueryBuilder()
        .select('COUNT(`command_type`)', 'count')
        .addSelect('command_type')
        .groupBy('command_type')
        .orderBy('count', 'DESC')
        .getRawMany();

    const commandCount: number = await LogEntry.count();

    const userCount = await LogEntry.createQueryBuilder()
        .select('COUNT(DISTINCT(`sender_id`))', 'count')
        .getRawOne();

    const serverCount = await LogEntry.createQueryBuilder()
        .select('COUNT(DISTINCT(`guild_id`))', 'count')
        .getRawOne();

    const channelCount = await LogEntry.createQueryBuilder()
        .select('COUNT(DISTINCT(`channel_id`))', 'count')
        .getRawOne();

    const trackingCount = await TrackingEntry.count();

    const trackingUsers = await TrackingEntry.createQueryBuilder()
        .select('COUNT(DISTINCT(`sender_id`))', 'count')
        .getRawOne();

    let reply = '';

    reply += makeBold('Top searched items');

    let iter = 0;
    for (const row of topItemOutput) {
        iter++;
        const searchTimes = row.count;
        const timesWord = pluralize('time', 'times', searchTimes);
        reply += newLine();
        const itemAmount = row.item_output;
        debug(itemAmount);
        reply += `${iter}. ${itemFormat(itemAmount)}, searched ${makeCode(searchTimes)} ${timesWord}.`;
        escape(reply);
    }

    reply += newLine(2);
    reply += makeBold('Command counts');
    reply += newLine();

    const userWord = pluralize('user', 'users', userCount.count);
    const commandsWord = pluralize('command', 'commands', commandCount);
    const channelWord = pluralize('channel', 'channels', channelCount.count);
    const serverWord = pluralize('server', 'servers', serverCount.count);

    reply += `I have processed ${makeCode(commandCount)} ${commandsWord} in total, ` +
        `issued by ${makeCode(userCount.count)} ${userWord} in ${makeCode(channelCount.count)} ${channelWord} ` +
        `on ${makeCode(serverCount.count)} ${serverWord}.`;
    reply += newLine();

    for (const row of topCommands) {
        reply += newLine();
        const timeWord = pluralize('time', 'times', row.count);
        reply += makeCode('/' + row.command_type) + ' has been issued ' + makeCode(row.count) + ` ${timeWord}.`;
    }

    reply += newLine(2);
    reply += makeBold('Price tracking');
    reply += newLine();
    const priceWord = pluralize('price', 'prices', trackingCount);
    const trackingUsersWord = pluralize('user', 'users', trackingUsers.count);
    reply += `I am currently tracking ${makeCode(trackingCount)} item ${priceWord} for ` +
        `for ${makeCode(trackingUsers.count)} unique ${trackingUsersWord}.`;

    if (client) {
        reply += newLine(2);
        reply += makeBold('Bot status');
        reply += newLine();
        const currentServerCount = client.serverCount;
        const currentServerWord = pluralize('server', 'servers', currentServerCount);
        reply += `I am currently online on ${makeCode(currentServerCount)} ${currentServerWord}.`;
        reply += newLine();
        const upTime = countdown(client.upTime) as countdown.Timespan;
        reply += `I've been running continuously for ${makeCode(upTime.toString())}.`;
    }

    return reply;
};
