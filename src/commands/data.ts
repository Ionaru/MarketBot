import * as countdown from 'countdown';

import { Message } from '../chat-service/discord/message';
import { logCommand, LogEntry } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { itemFormat, makeBold, makeCode, newLine } from '../helpers/message-formatter';
import { client, commandPrefix } from '../market-bot';
import { TrackingEntry } from './track';

export async function dataCommand(message: Message, transaction: any) {

  const topItemOutput = await LogEntry.createQueryBuilder()
    .select('COUNT(`item_output`)', 'count')
    .addSelect('item_output')
    .groupBy('item_output')
    .orderBy('count', 'DESC')
    .limit(5)
    .getRawMany() as Array<{ count: number, item_output: string}>;

  const topCommands = await LogEntry.createQueryBuilder()
    .select('COUNT(`command_type`)', 'count')
    .addSelect('command_type')
    .groupBy('command_type')
    .orderBy('count', 'DESC')
    .getRawMany() as Array<{ count: number, command_type: string }>;

  const commandCount: number = await LogEntry.count();

  const userCount = await LogEntry.createQueryBuilder()
    .select('COUNT(DISTINCT(`sender_id`))', 'count')
    .getRawOne() as { count: number };

  const serverCount = await LogEntry.createQueryBuilder()
    .select('COUNT(DISTINCT(`guild_id`))', 'count')
    .getRawOne() as { count: number };

  const channelCount = await LogEntry.createQueryBuilder()
    .select('COUNT(DISTINCT(`channel_id`))', 'count')
    .getRawOne() as { count: number };

  const trackingCount = await TrackingEntry.count();

  const trackingUsers = await TrackingEntry.createQueryBuilder()
    .select('COUNT(DISTINCT(`sender_id`))', 'count')
    .getRawOne() as {count: number};

  let reply = '';

  reply += makeBold('Top searched items');

  let iter = 0;
  for (const row of topItemOutput) {
    iter++;
    const searchTimes = row.count;
    const timesWord = pluralize('time', 'times', searchTimes);
    reply += newLine();
    const itemAmount = row.item_output as string;
    reply += `${iter}. ${itemFormat(itemAmount)}, searched ${makeCode(searchTimes)} ${timesWord}.`;
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

  await message.reply(reply);
  logCommand('data', message, undefined, undefined, transaction);
}
