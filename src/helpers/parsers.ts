import * as Discord from 'discord.js';
import { ParsedMessage } from '../typings';
import { commandPrefix, limitCommand, regionCommand } from '../market-bot';

export function parseMessage(message: Discord.Message): ParsedMessage {
  const parsedMessage: ParsedMessage = {
    item: null,
    region: null,
    limit: null,
  };

  // Remove double spaces because that confuses the input guessing system
  const messageText = message.content.replace(/ +(?= )/g, '');

  // Split the message into seperate words and remove the first word (the command tag)
  const messageWords = messageText.split(' ');
  messageWords.shift();

  // Search for the item text
  let itemText = messageWords.join(' ');
  if (itemText.indexOf(commandPrefix) !== -1) {
    itemText = itemText.substring(0, itemText.indexOf(commandPrefix)).trim();
  }
  parsedMessage.item = itemText;

  // Search for the region text
  const regionCommandIndex = messageText.indexOf(regionCommand);
  if (regionCommandIndex !== -1) {
    let sep1 = messageText.substring(regionCommandIndex + regionCommand.length).trim();
    if (sep1.indexOf(commandPrefix) !== -1) {
      sep1 = sep1.substring(0, sep1.indexOf(commandPrefix)).trim();
    }
    parsedMessage.region = sep1;
  }

  // Search for the limit text
  const limitCommandIndex = messageText.indexOf(limitCommand);
  if (limitCommandIndex !== -1) {
    let sep1 = messageText.substring(limitCommandIndex + limitCommand.length).trim();
    if (sep1.indexOf(commandPrefix) !== -1) {
      sep1 = sep1.substring(0, sep1.indexOf(commandPrefix)).trim();
    }
    parsedMessage.limit = Number(sep1);
  }

  return parsedMessage;
}
