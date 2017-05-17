import * as Discord from 'discord.js';
import * as countdown from 'countdown';
import {
  buyOrdersCommands,
  client,
  commandPrefix,
  creator,
  dataCommands,
  infoCommands,
  limitCommands,
  priceCommands,
  regionCommands,
  sellOrdersCommands
} from '../market-bot';
import { logCommand } from '../helpers/command-logger';
import { pluralize } from '../helpers/formatters';

export async function infoFunction(discordMessage: Discord.Message) {

  const priceCommand = commandPrefix + priceCommands[0];
  const regionCommand = commandPrefix + regionCommands[0];
  const limitCommand = commandPrefix + limitCommands[0];
  const sellOrdersCommand = commandPrefix + sellOrdersCommands[0];
  const buyOrdersCommand = commandPrefix + buyOrdersCommands[0];
  const dataCommand = commandPrefix + dataCommands[0];
  const infoCommand = commandPrefix + infoCommands[0];

  const serverCount = client.guilds.array().length;
  const serverWord = pluralize('server', 'servers', serverCount);

  const onlineTime = countdown(client.readyAt);

  await discordMessage.channel.send(`**Greetings, I am MarketBot!**\n` +
    `I was created by <@${creator.id}> to fetch information from the EVE Online market, ` +
    `all my data currently comes from EVE-Central, stop.hammerti.me.uk, the EVE Swagger Interface ` +
    `and the Static Data Export provided by CCP.\n` +
    `\n` +
    `**Commands**\n` +
    `You can access my functions by using these commands:\n\n` +
    `- \`${priceCommand} <item name> ${regionCommand} <region name>\` ` +
    `- Use this to let me fetch data from the EVE Online market for a given item, ` +
    `by default I use the market in The Forge region (where Jita is).\n\n` +
    `- \`${sellOrdersCommand} <item name> ${regionCommand} <region name> ${limitCommand} <limit>\` ` +
    `- When issued with this command, I will search a regional market for the cheapest sell orders available. ` +
    `*This does not include orders in Citadels*.\n\n` +
    `- \`${buyOrdersCommand} <item name> ${regionCommand} <region name> ${limitCommand} <limit>\` ` +
    `- When issued with this command, I will search a regional market for the highest buy orders available.\n\n` +
    `- \`${dataCommand} ${limitCommand} <limit>\` - Show a list of most searched items.\n\n` +
    `- \`${infoCommand}\` - Show this information.\n\n` +
    `*\`${regionCommand}\` and \`${limitCommand}\` are always optional*\n` +
    `\n` +
    `**Status**\n` +
    `I am currently active on ${serverCount} ${serverWord}.\n` +
    `I've been online for ${onlineTime}.\n` +
    `\n` +
    `**More information**\n` +
    `You can find information like source code, command aliases, self-hosting, logging and new features on ` +
    `<https://github.com/Ionaru/MarketBot>.`);
  logCommand('info', discordMessage);
}
