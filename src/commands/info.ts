import { Message } from '../chat-service/discord/message';
import { logCommand } from '../helpers/command-logger';
import { makeBold, makeCode, makeURL, newLine } from '../helpers/message-formatter';
import { botName, client, creator, version } from '../market-bot';

export async function infoCommand(message: Message, transaction: any) {

  let reply = makeBold(`Greetings, I am ${botName}!`);

  if (client) {
    const name = client.getNickname(message) || client.name;

    if (name !== botName) {
      reply += newLine();
      reply += `You may know me as ${makeBold(name!)} in this channel.`;
    }
  }

  reply += newLine(2);
  reply += `I was created by ${makeCode(creator)} to fetch information from the EVE Online market and provide you with accurate `;
  reply += `price information.`;
  reply += newLine();
  reply += `The data I use comes from the EVE Swagger Interface provided by CCP, as well as `;
  reply += `the EVEMarketer and stop.hammerti.me.uk APIs created by some amazing third-party developers.`;
  reply += newLine(2);
  reply += makeBold('Commands');
  reply += newLine();
  reply += `To learn which commands you can give me, look on this web page:`;
  reply += newLine();
  reply += makeURL('https://ionaru.github.io/MarketBot/commands/');
  reply += newLine(2);
  reply += makeBold('Permissions');
  reply += newLine();
  reply += `To function correctly, I need the right set of permissions in Discord, you can find them on this web page:`;
  reply += newLine();
  reply += makeURL('https://ionaru.github.io/MarketBot/permissions/');
  reply += newLine(2);
  reply += makeBold('More information');
  reply += newLine();
  reply += `You can find information like source code, command aliases, self-hosting, logging and new features on `;
  reply += makeURL('https://ionaru.github.io/MarketBot/');
  reply += newLine(2);
  reply += makeBold('Version');
  reply += newLine();

  reply += `My current version is ${makeCode(version)}.`;

  await message.reply(reply);
  logCommand('info', message, undefined, undefined, transaction);
}
