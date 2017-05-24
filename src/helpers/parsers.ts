import { ParsedMessage, SDEObject } from '../typings';
import { commandPrefix, limitCommandRegex, regionCommandRegex } from '../market-bot';

export function parseMessage(message: string, regexp?: RegExp): ParsedMessage {
  const parsedMessage: ParsedMessage = {
    item: null,
    region: null,
    limit: null,
  };

  // Remove double spaces because that confuses the input guessing system
  let messageText = message.replace(/ +(?= )/g, '');
  let messageWords: Array<string> = null;

  if (regexp) {
    const match = messageText.match(regexp);
    messageText = messageText.replace(match[0], '');
  } else {
    // Split the message into seperate words and remove the first word (the command tag)
    messageWords = messageText.split(' ');
    messageWords.shift();
  }

  if (messageWords) {
    messageText = messageWords.join(' ');
  }

  // Search for the item text
  let itemText = messageText;
  if (itemText.indexOf(commandPrefix) !== -1) {
    itemText = itemText.substring(0, itemText.indexOf(commandPrefix)).trim();
  }
  parsedMessage.item = itemText;

  // Search for the region text
  const regionMatch = messageText.match(regionCommandRegex);
  if (regionMatch) {
    let sep1 = messageText.substring(regionMatch.index + regionMatch[0].length).trim();
    if (sep1.indexOf(commandPrefix) !== -1) {
      sep1 = sep1.substring(0, sep1.indexOf(commandPrefix)).trim();
    }
    parsedMessage.region = sep1;
  }

  // Search for the limit text
  const limitMatch = messageText.match(limitCommandRegex);
  if (limitMatch) {
    let sep1 = messageText.substring(limitMatch.index + limitMatch[0].length).trim();
    if (sep1.indexOf(commandPrefix) !== -1) {
      sep1 = sep1.substring(0, sep1.indexOf(commandPrefix)).trim();
    }
    parsedMessage.limit = Number(sep1);
  }

  return parsedMessage;
}

export function parseTypeIDs(typeIDs: Object): Array<SDEObject> {
  const itemsArray = [];

  for (const key in typeIDs) {
    if (typeIDs.hasOwnProperty(key)) {
      const value: SDEObject = typeIDs[key];
      value.itemID = Number(key);
      itemsArray.push(value);
    }
  }

  return itemsArray;
}
