import * as Discord from 'discord.js';
import { logCommand, LogEntry, LogEntryInstance } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';
import { parseMessage } from '../helpers/parsers';
import SequelizeStatic = require('sequelize');

export async function dataFunction(discordMessage: Discord.Message) {

  const parsedMessage = parseMessage(discordMessage);

  const limit = Math.abs(parsedMessage.limit) || 5;

  const topItemOutput: Array<LogEntryInstance> = await LogEntry.findAll({
    attributes: ['item_output', [SequelizeStatic.fn('COUNT', SequelizeStatic.col('item_output')), 'number']],
    group: ['item_output'],
    order: [[SequelizeStatic.literal('number'), 'DESC']],
    limit: [limit]
  });

  let reply = '';

  if (topItemOutput) {
    const areWord = pluralize('is', 'are', limit);
    const itemWord = pluralize('item', 'items', limit);
    reply += `Here ${areWord} the top ${limit} searched ${itemWord}:\n\n`;

    let iter = 0;
    for (const row of topItemOutput) {
      iter++;
      const searchTimes = row['dataValues']['number'];
      const timesWord = pluralize('time', 'times', searchTimes);
      const replyAddition = `${iter}. \`${row.item_output}\`, searched \`${searchTimes}\` ${timesWord}.\n`;

      if (replyAddition.length + reply.length < 2000) {
        // Adding this line will not make the message exceed the character limit, carry on.
        reply += replyAddition;
      } else {
        // We've reached the character limit, break from the loop.
        break;
      }
    }
  } else {
    reply = 'I was unable to fetch the required data, please try again later.';
  }

  await discordMessage.channel.sendMessage(reply);
  logCommand('data', discordMessage);
}
