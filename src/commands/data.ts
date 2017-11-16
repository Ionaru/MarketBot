import * as countdown from 'countdown';
import SequelizeStatic = require('sequelize');

import { Message } from '../chat-service/discord/message';
import { ILogEntryInstance, logCommand, logEntry } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { itemFormat, makeBold, makeCode, newLine } from '../helpers/message-formatter';
import { client, commandPrefix } from '../market-bot';
import { TrackingEntry } from './track';

export async function dataFunction(message: Message) {

  const topItemOutput: ILogEntryInstance[] = await logEntry.findAll({
    attributes: ['item_output', [SequelizeStatic.fn('COUNT', SequelizeStatic.col('item_output')), 'number']],
    group: ['item_output'],
    limit: [5],
    order: [[SequelizeStatic.literal('number'), 'DESC']]
  });

  const topCommands: ILogEntryInstance[] = await logEntry.findAll({
    attributes: ['command_type', [SequelizeStatic.fn('COUNT', SequelizeStatic.col('command_type')), 'number']],
    group: ['command_type'],
    order: [[SequelizeStatic.literal('number'), 'DESC']]
  });

  const commandCount: number = await logEntry.count();
  const userCount: number = await logEntry.aggregate('sender_id', 'count', {distinct: true});
  const serverCount: number = await logEntry.aggregate('guild_id', 'count', {distinct: true});
  const channelCount: number = await logEntry.aggregate('channel_id', 'count', {distinct: true});

  const trackingCount = await TrackingEntry.count();
  const trackingUsersResult = await TrackingEntry.getRepository().createQueryBuilder('tracking_entry')
    .select('COUNT(DISTINCT(`sender_id`))', 'count').getRawOne() as {count: number};
  const trackingUsers = trackingUsersResult.count;

  let reply = '';

  reply += makeBold('Top searched items');

  let iter = 0;
  for (const row of topItemOutput) {
    iter++;
    const searchTimes = row.getDataValue('number');
    const timesWord = pluralize('time', 'times', searchTimes);
    reply += newLine();
    const itemAmount = row.item_output as string;
    reply += `${iter}. ${itemFormat(itemAmount)}, searched ${makeCode(searchTimes)} ${timesWord}.`;
  }

  reply += newLine(2);
  reply += makeBold('Command counts');
  reply += newLine();

  const userWord = pluralize('user', 'users', userCount);
  const commandsWord = pluralize('command', 'commands', commandCount);
  const channelWord = pluralize('channel', 'channels', channelCount);
  const serverWord = pluralize('server', 'servers', serverCount);

  reply += `I have processed ${makeCode(commandCount)} ${commandsWord} in total, ` +
    `issued by ${makeCode(userCount)} ${userWord} in ${makeCode(channelCount)} ${channelWord} ` +
    `on ${makeCode(serverCount)} ${serverWord}.`;
  reply += newLine();

  for (const row of topCommands) {
    reply += newLine();
    const timeWord = pluralize('time', 'times', row.getDataValue('number'));
    reply += makeCode(commandPrefix + row.command_type) + ' has been issued ' + makeCode(row.getDataValue('number')) + ` ${timeWord}.`;
  }

  reply += newLine(2);
  reply += makeBold('Price tracking');
  reply += newLine();
  const priceWord = pluralize('price', 'prices', trackingCount);
  const trackingUsersWord = pluralize('user', 'users', trackingUsers);
  reply += `I am currently tracking ${makeCode(trackingCount)} item ${priceWord} for ` +
    `for ${makeCode(trackingUsers)} unique ${trackingUsersWord}.`;

  if (client) {
    reply += newLine(2);
    reply += makeBold('Bot status');
    reply += newLine();
    const currentServerCount = client.serverCount;
    const currentServerWord = pluralize('server', 'servers', currentServerCount);
    reply += `I am currently online on ${makeCode(currentServerCount)} ${currentServerWord}.`;
    reply += newLine();
    const upTime = countdown(client.upTime) as countdown.Timespan;
    reply += `I've been online for ${makeCode(upTime.toString())}.`;
  }

  await message.reply(reply);
  logCommand('data', message);
}
