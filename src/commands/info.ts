import {
  buyOrdersCommands,
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

  let reply = makeBold('Greetings, I am MarketBot!');
  reply += newLine();
  reply += `I was created by ${makeUserLink(creator.id)} to fetch information from the EVE Online market, `;
  reply += `all my data currently comes from EVE-Central, stop.hammerti.me.uk, the EVE Swagger Interface `;
  reply += `and the Static Data Export provided by CCP.`;
  reply += newLine(2);
  reply += `${makeBold('Commands')}`;
  reply += newLine();
  reply += `You can access my functions by using these commands:`;
  reply += newLine(2);
  reply += `- ${makeCode(`${priceCommand} <item name> ${regionCommand} <region name>`)} `;
  reply += `- Use this to let me fetch data from the EVE Online market for a given item, `;
  reply += `by default I use the market in The Forge region (where Jita is).`;
  reply += newLine(2);
  reply += `- ${makeCode(`${sellOrdersCommand} <item name> ${regionCommand} <region name> ${limitCommand} <limit>`)} `;
  reply += `- When issued with this command, I will search a regional market for the cheapest sell orders available. `;
  reply += `*This does not include orders in Citadels*.`;
  reply += newLine(2);
  reply += `- ${makeCode(`${buyOrdersCommand} <item name> ${regionCommand} <region name> ${limitCommand} <limit>`)} `;
  reply += `- When issued with this command, I will search a regional market for the highest buy orders available.`;
  reply += newLine(2);
  reply += `- ${makeCode(dataCommand)} - Show some bot statistics.`;
  reply += newLine(2);
  reply += `- ${makeCode(infoCommand)} - Show this information.`;
  reply += newLine(2);
  reply += makeItalics(`${makeCode(regionCommand)} and ${makeCode(limitCommand)} are always optional`);
  reply += newLine(2);
  reply += makeBold('More information');
  reply += newLine();
  reply += `You can find information like source code, command aliases, self-hosting, logging and new features on `;
  reply += makeURL('https://github.com/Ionaru/MarketBot');

  await message.reply(reply);
  logCommand('info', message);
}
