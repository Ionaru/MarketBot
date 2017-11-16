import { Message } from '../chat-service/discord/message';
import { fetchCategory, fetchGroup, fetchMarketGroup } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { getGuessHint, guessUserItemInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { IMarketGroup, IParsedMessage, ISDEObject } from '../typings';

interface ItemCommandLogicReturn {
  reply: string;
  itemData: ISDEObject | undefined;
}

export async function itemCommand(message: Message) {
  const messageData = parseMessage(message.content);

  messageData.limit = messageData.limit || 5;

  const replyPlaceHolder = await message.reply(
    `Gathering information about the item, ${message.sender}...`
  );

  const {reply, itemData} = await itemCommandLogic(messageData);

  const replyOptions = itemData ? {files: [`https://image.eveonline.com/Type/${itemData.itemID}_64.png`]} : undefined;
  await replyPlaceHolder.reply(reply, replyOptions);
  replyPlaceHolder.remove().then();

  logCommand('item', message, (itemData ? itemData.name.en : undefined), undefined);
}

async function itemCommandLogic(messageData: IParsedMessage): Promise<ItemCommandLogicReturn> {

  let reply = '';

  if (!(messageData.item && messageData.item.length)) {
    reply += 'You need to give me an item to search for.';
    return {reply, itemData: undefined};
  }

  const {itemData, guess, id}: IGuessReturn = guessUserItemInput(messageData.item);

  reply += getGuessHint({itemData, guess, id}, messageData.item);

  if (!itemData) {
    return {reply, itemData: undefined};
  }

  reply += `Information about ${itemFormat(itemData.name.en as string)}:`;
  reply += '```';
  reply += `> ID: ${itemData.itemID}`;
  reply += newLine();
  reply += `> Name: ${itemData.name.en}`;
  reply += newLine();
  if (itemData.groupID) {
    const group = await fetchGroup(itemData.groupID);
    if (group !== undefined) {
      reply += `> Group: ${group.name}`;
      reply += newLine();

      if (group.category_id) {
        const category = await fetchCategory(group.category_id);
        if (category) {
          reply += `> Category: ${category.name}`;
          reply += newLine();
        }
      }
    }
  }

  if (itemData.marketGroupID) {
    const marketGroups = [];
    let marketGroupId: number | undefined = itemData.marketGroupID;
    while (marketGroupId !== undefined) {
      const marketGroup: IMarketGroup | undefined = await fetchMarketGroup(marketGroupId);
      if (marketGroup) {
        marketGroups.unshift(marketGroup.name);
        marketGroupId = marketGroup.parent_group_id ? marketGroup.parent_group_id : undefined;
      }
    }
    reply += `> Market location: ${marketGroups.join(' > ')}`;
    reply += newLine();

  }
  if (itemData.volume) {
    reply += `> Volume: ${itemData.volume}m³`;
    reply += newLine();
  }
  reply += '```';

  return {reply, itemData};
}
