import * as Discord from 'discord.js';
import { commandPrefix, creator, infoCommands, limitCommands, ordersCommands, priceCommands, regionCommands } from '../market-bot';
import { logCommand } from '../helpers/command-logger';

export async function infoFunction(discordMessage: Discord.Message) {

  const priceCommand = commandPrefix + priceCommands[0];
  const regionCommand = commandPrefix + regionCommands[0];
  const limitCommand = commandPrefix + limitCommands[0];
  const ordersCommand = commandPrefix + ordersCommands[0];
  const infoCommand = commandPrefix + infoCommands[0];

  const priceCommandList = priceCommands.map((element) => commandPrefix + element).join(' ');
  const ordersCommandList = ordersCommands.map((element) => commandPrefix + element).join(' ');
  const infoCommandList = infoCommands.map((element) => commandPrefix + element).join(' ');
  const regionCommandList = regionCommands.map((element) => commandPrefix + element).join(' ');
  const limitCommandList = limitCommands.map((element) => commandPrefix + element).join(' ');

  await discordMessage.channel.sendMessage('Greetings, I am MarketBot!\n' +
    `I was created by <@${creator.id}> to fetch data from the EVE Online market, ` +
    'all my data currently comes from EVE-Central, the EVE Swagger Interface ' +
    'and the Static Data Export provided by CCP.\n\n' +
    'You can access my functions by using these commands:\n\n' +
    `- \`${priceCommand} <item name> [${regionCommand} <region name>]\` ` +
    '- Use this to let me fetch data from the EVE Online market for a given item, ' +
    'by default I use the market in The Forge region (where Jita is).\n\n' +
    `- \`${ordersCommand} <item name> [${regionCommand} <region name>] ` +
    `[${limitCommand} <limit>]\` ` +
    '- When issued with this command, I will search a regional market for the best sell orders available. ' +
    '**This does not include Citadels**\n\n' +
    `- \`${infoCommand}\` - Print this information.\n\n` +
    `I also respond to a number of aliases for the above commands:\n\n` +
    `- \`${priceCommandList}\`\n\n` +
    `- \`${ordersCommandList}\`\n\n` +
    `- \`${infoCommandList}\`\n\n` +
    `- \`${regionCommandList}\`\n\n` +
    `- \`${limitCommandList}\`\n\n` +
    'My code is publicly available on `https://github.com/Ionaru/MarketBot`');
  logCommand('info', discordMessage);
}
