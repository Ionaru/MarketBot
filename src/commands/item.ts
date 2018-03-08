import * as Discord from 'discord.js';
import { Message } from '../chat-service/discord/message';
import { fetchCategory, fetchGroup, fetchMarketGroup, fetchPriceData, fetchUniverseType } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber } from '../helpers/formatters';
import { getGuessHint, guessUserInput, IGuessReturn } from '../helpers/guessers';
import { newLine } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { items, itemsFuse } from '../market-bot';
import { IMarketGroup, INamesData, IParsedMessage, IPriceData } from '../typings';

interface IItemCommandLogicReturn {
  reply: Discord.RichEmbed;
  itemData: INamesData | undefined;
}

export async function itemCommand(message: Message, transaction: any) {
  const messageData = parseMessage(message.content);

  messageData.limit = messageData.limit || 5;

  const replyPlaceHolder = await message.reply(
    `Gathering information about the item, ${message.sender}...`
  );

  const {reply, itemData} = await itemCommandLogic(messageData);

  await replyPlaceHolder.reply('', {embed: reply});
  replyPlaceHolder.remove().then();

  logCommand('item', message, (itemData ? itemData.name : undefined), undefined, transaction);
}

async function itemCommandLogic(messageData: IParsedMessage): Promise<IItemCommandLogicReturn> {

  const reply = new Discord.RichEmbed();

  if (!(messageData.item && messageData.item.length)) {
    reply.addField('Error', 'You need to give me an item to search for.');
    return {reply, itemData: undefined};
  }

  const {itemData, guess, id}: IGuessReturn = guessUserInput(messageData.item, items, itemsFuse);

  const guessHint = getGuessHint({itemData, guess, id}, messageData.item);
  if (guessHint) {
    reply.addField('Warning', guessHint);
  }

  if (!itemData) {
    return {reply, itemData: undefined};
  }

  reply.setAuthor(itemData.name, `http://data.saturnserver.org/eve/Icons/UI/WindowIcons/info.png`);
  reply.setThumbnail(`https://image.eveonline.com/Type/${itemData.id}_64.png`);

  const item = await fetchUniverseType(itemData.id);

  let itemInfo = '';
  itemInfo += `* ID: ${itemData.id}`;
  itemInfo += newLine();
  itemInfo += `* Name: ${itemData.name}`;
  itemInfo += newLine();
  if (item && item.group_id) {
    const group = await fetchGroup(item.group_id);
    if (group) {
      itemInfo += `* Group: ${group.name}`;
      itemInfo += newLine();

      if (group.category_id) {
        const category = await fetchCategory(group.category_id);
        if (category) {
          itemInfo += `* Category: ${category.name}`;
          itemInfo += newLine();
        }
      }
    }
  }

  if (item && item.volume) {
    itemInfo += `* Volume: ${item.volume}m³`;
    itemInfo += newLine();
  }

  reply.addField('Item info', itemInfo);

  let marketInfo = '';
  if (item && item.market_group_id) {
    const marketGroups = [];
    let marketGroupId: number | undefined = item.market_group_id;
    while (marketGroupId !== undefined) {
      const marketGroup: IMarketGroup | undefined = await fetchMarketGroup(marketGroupId);
      if (marketGroup) {
        marketGroups.unshift(marketGroup.name);
        marketGroupId = marketGroup.parent_group_id ? marketGroup.parent_group_id : undefined;
      }
    }
    marketInfo += `* Market location: ${marketGroups.join(' / ')}`;

    const json = await fetchPriceData(itemData.id, 30000142);
    if (json && json.length) {
      const sellData: IPriceData = json[0].sell;
      const buyData: IPriceData = json[0].buy;
      marketInfo += newLine();
      marketInfo += `* Jita sell price: ${formatNumber(sellData.avg)} ISK`;
      marketInfo += newLine();
      marketInfo += `* Jita buy price: ${formatNumber(buyData.avg)} ISK`;
    }

    marketInfo += newLine();
  }

  if (marketInfo) {
    reply.addField('Market info', marketInfo);
  }

  return {reply, itemData};
}
