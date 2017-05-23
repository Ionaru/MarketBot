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
import { makeBold, makeCode, makeItalics, makeURL, makeUserLink, newLine } from '../helpers/message-formatter';
import { Message } from '../chat-service/discord-interface';

export async function infoFunction(message: Message) {

  const priceCommand = commandPrefix + priceCommands[0];
  const regionCommand = commandPrefix + regionCommands[0];
  const limitCommand = commandPrefix + limitCommands[0];
  const sellOrdersCommand = commandPrefix + sellOrdersCommands[0];
  const buyOrdersCommand = commandPrefix + buyOrdersCommands[0];
  const dataCommand = commandPrefix + dataCommands[0];
  const infoCommand = commandPrefix + infoCommands[0];

  const serverCount = client.serverCount;
  const serverWord = pluralize('server', 'serverCount', serverCount);

  const onlineTime = countdown(client.upTime);

  await message.reply(makeBold('Greetings, I am MarketBot!') + newLine() +
    `I was created by ${makeUserLink(creator.id)} to fetch information from the EVE Online market, ` +
    `all my data currently comes from EVE-Central, stop.hammerti.me.uk, the EVE Swagger Interface ` +
    `and the Static Data Export provided by CCP.` + newLine() +
    newLine() +
    `${makeBold('Commands')}` + newLine() +
    `You can access my functions by using these commands:` + newLine(2) +
    `- ${makeCode(`${priceCommand} <item name> ${regionCommand} <region name>`)} ` +
    `- Use this to let me fetch data from the EVE Online market for a given item, ` +
    `by default I use the market in The Forge region (where Jita is).` + newLine(2) +
    `- ${makeCode(`${sellOrdersCommand} <item name> ${regionCommand} <region name> ${limitCommand} <limit>`)} ` +
    `- When issued with this command, I will search a regional market for the cheapest sell orders available. ` +
    `*This does not include orders in Citadels*.` + newLine(2) +
    `- ${makeCode(`${buyOrdersCommand} <item name> ${regionCommand} <region name> ${limitCommand} <limit>`)} ` +
    `- When issued with this command, I will search a regional market for the highest buy orders available.` + newLine(2) +
    `- ${makeCode(`${dataCommand} ${limitCommand} <limit>`)} - Show a list of most searched items.` + newLine(2) +
    `- ${makeCode(`${infoCommand}`)} - Show this information.` + newLine(2) +
    makeItalics(`${makeCode(regionCommand)} and ${makeCode(limitCommand)} are always optional`) + newLine() +
    newLine() +
    makeBold('Status') + newLine() +
    `I am currently active on ${serverCount} ${serverWord}.` + newLine() +
    `I've been online for ${onlineTime}.` + newLine() +
    newLine() +
    makeBold('More information') + newLine() +
    `You can find information like source code, command aliases, self-hosting, logging and new features on ` +
    makeURL('https://github.com/Ionaru/MarketBot'));
  logCommand('info', message);
}
