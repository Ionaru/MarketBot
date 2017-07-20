import * as countdown from 'countdown';
import { logCommand, LogEntry, LogEntryInstance } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { itemFormat, makeBold, makeCode, newLine } from '../helpers/message-formatter';
import { Message } from '../chat-service/discord-interface';
import SequelizeStatic = require('sequelize');
import { client, commandPrefix } from '../market-bot';
import { TrackingEntry } from './track';

export async function dataFunction(message: Message) {

  const topItemOutput: Array<LogEntryInstance> = await LogEntry.findAll({
    attributes: ['item_output', [SequelizeStatic.fn('COUNT', SequelizeStatic.col('item_output')), 'number']],
    group: ['item_output'],
    order: [[SequelizeStatic.literal('number'), 'DESC']],
    limit: [5]
  });

  const topCommands: Array<LogEntryInstance> = await LogEntry.findAll({
    attributes: ['command_type', [SequelizeStatic.fn('COUNT', SequelizeStatic.col('command_type')), 'number']],
    group: ['command_type'],
    order: [[SequelizeStatic.literal('number'), 'DESC']]
  });

  const commandCount: number = await LogEntry.count();
  const userCount: number = await LogEntry.aggregate('sender_id', 'count', {distinct: true});
  const serverCount: number = await LogEntry.aggregate('guild_id', 'count', {distinct: true});
  const channelCount: number = await LogEntry.aggregate('channel_id', 'count', {distinct: true});

  const trackingCount: number = await TrackingEntry.aggregate('id', 'count');
  const trackingUsers: number = await TrackingEntry.aggregate('sender_id', 'count', {distinct: true});

  let reply = '';

  reply += makeBold('Top searched items');

  let iter = 0;
  for (const row of topItemOutput) {
    iter++;
    const searchTimes = row['dataValues']['number'];
    const timesWord = pluralize('time', 'times', searchTimes);
    reply += newLine();
    reply += `${iter}. ${itemFormat(row.item_output)}, searched ${makeCode(searchTimes)} ${timesWord}.`;
  }

  reply += newLine(2);
  reply += makeBold('Command counts');
  reply += newLine();

  let userWord = pluralize('user', 'users', userCount);
  const channelWord = pluralize('channel', 'channels', channelCount);
  let serverWord = pluralize('server', 'servers', serverCount);

  reply += `I have processed ${makeCode(commandCount + ' commands')} in total, ` +
    `issued by ${makeCode(userCount)} ${userWord} in ${makeCode(channelCount)} ${channelWord} ` +
    `on ${makeCode(serverCount)} ${serverWord}.`;
  reply += newLine();

  for (const row of topCommands) {
    reply += newLine();
    const timeWord = pluralize('time', 'times', row['dataValues']['number']);
    reply += makeCode(commandPrefix + row.command_type) + ' has been issued ' + makeCode(row['dataValues']['number']) + ` ${timeWord}.`;
  }

  reply += newLine(2);
  reply += makeBold('Price tracking');
  reply += newLine();
  const priceWord = pluralize('price', 'prices', trackingCount);
  userWord = pluralize('user', 'users', trackingUsers);
  reply += `I am currently tracking ${makeCode(trackingCount)} item ${priceWord} for ${makeCode(trackingUsers)} unique ${userWord}.`;

  reply += newLine(2);
  reply += makeBold('Bot status');
  reply += newLine();
  const currentServerCount = client.serverCount;
  serverWord = pluralize('server', 'serverCount', currentServerCount);
  reply += `I am currently online on ${makeCode(`${currentServerCount} ${serverWord}`)}.`;
  reply += newLine();
  reply += `I've been online for ${makeCode(countdown(client.upTime))}.`;

  await message.reply(reply);
  logCommand('data', message);
}
