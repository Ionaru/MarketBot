import * as Discord from 'discord.js';
import { creator, infoCommand, limitCommand, ordersCommand, priceCommand, regionCommand } from '../market-bot';
import { logCommand } from '../helpers/command-logger';

export async function infoFunction(discordMessage: Discord.Message) {
  await discordMessage.channel.sendMessage('Greetings, I am MarketBot!\n' +
    `I was created by <@${creator.id}> to fetch data from the EVE Online market, ` +
    'all my data currently comes from https://eve-central.com, the EVE Swagger Interface ' +
    'and the Static Data Export provided by CCP.\n\n' +
    'You can access my functions by using these commands:\n\n' +
    `- \`${priceCommand} <item name> [${regionCommand} <region name>]\` ` +
    '- Use this to let me fetch data from the EVE Online market for a given item, ' +
    'by default I use the market in The Forge region (where Jita is).\n\n' +
    `- \`${ordersCommand} <item name> [${regionCommand} <region name>] [${limitCommand} <limit>]\` ` +
    '- When issued with this command, I will search a regional market for the best sell orders available.' +
    '\n**Warning! This does not include Citadels**\n\n' +
    `- \`${infoCommand}\` - Print this information.\n\n` +
    'My code is publicly available on https://github.com/Ionaru/MarketBot');
  logCommand('info', discordMessage);
}
