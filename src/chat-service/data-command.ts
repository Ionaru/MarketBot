import countdown from 'countdown';

import { TrackingEntry } from '../commands/track';
import { debug } from '../debug';
import { LogEntry } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { itemFormat, makeBold, makeCode, newLine } from '../helpers/message-formatter';
import { createCommandRegex } from '../helpers/regex';
import { client, commandPrefix } from '../market-bot';

import { Command } from './command';

export class DataCommand extends Command {

    public static readonly debug = Command.debug.extend('data');

    private static readonly commands = [
        'data', 'd', 'stats',
    ];

    private static readonly commandRegex = createCommandRegex(DataCommand.commands, true);

    protected readonly initialReply = `Fetching data, one moment, ${this.message.sender}...`;
    protected readonly commandName = DataCommand.commands[0];

    public static test(command: string) {
        DataCommand.debug(`Testing ${command}`);
        return DataCommand.commandRegex.test(command);
    }

    protected async isCommandValid() {
        return true;
    }

    protected async processCommand() {
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
            reply += makeCode(commandPrefix + row.command_type) + ' has been issued ' + makeCode(row.count) + ` ${timeWord}.`;
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

        this.reply.text = reply;
        delete this.reply.options;
    }
}
