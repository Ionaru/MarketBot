import * as d3 from 'd3';
import * as fs from 'fs';

import { Message } from '../chat-service/discord/message';
import { fetchHistoryData } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber } from '../helpers/formatters';
import { createLineGraph, exportGraphImage } from '../helpers/graph';
import { getGuessHint, guessUserItemInput, guessUserRegionInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { regionList } from '../regions';
import { IParsedMessage, ISDEObject } from '../typings';

interface IHistoryCommandLogicReturn {
  reply: string;
  itemData: ISDEObject | undefined;
  regionName: string | undefined;
  fileName?: string;
}

export async function historyFunction(message: Message) {
  const messageData = parseMessage(message.content);

  const replyPlaceHolder = await message.reply(
    `Checking history, one moment, ${message.sender}...`
  );

  const {reply, itemData, regionName, fileName} = await historyCommandLogic(messageData);

  const replyOptions = fileName ? {files: [fileName]} : undefined;
  await replyPlaceHolder.reply(reply, replyOptions);
  replyPlaceHolder.remove().then();

  logCommand('history', message, (itemData ? itemData.name.en : undefined), (regionName ? regionName : undefined));
}

export async function historyCommandLogic(messageData: IParsedMessage): Promise<IHistoryCommandLogicReturn> {

  let regionName = '';
  let reply = '';

  if (!(messageData.item && messageData.item.length)) {
    reply = 'You need to give me an item to search for.';
    return {reply, itemData: undefined, regionName};
  }

  const {itemData, guess, id}: IGuessReturn = guessUserItemInput(messageData.item);

  reply += getGuessHint({itemData, guess, id}, messageData.item);

  if (!itemData) {
    return {reply, itemData: undefined, regionName};
  }

  let regionId: number | void = 10000002;

  if (messageData.region) {
    regionId = guessUserRegionInput(messageData.region);
    if (!regionId) {
      regionId = 10000002;
      reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(regionList[regionId])}`;
      reply += newLine(2);
    }
  }

  regionName = regionList[regionId];

  const historyData = await fetchHistoryData(itemData.itemID, regionId);

  if (!historyData) {
    reply += 'My apologies, I was unable to fetch the required data from the web, please try again later.';
    return {reply, itemData, regionName};
  }

  if (!historyData.length) {
    reply = `I couldn't find any price history for ${itemFormat(itemData.name.en as string)}`;
    return {reply, itemData, regionName};
  }

  const last20days = historyData.slice(-20).reverse();
  reply += `Price history for ${itemFormat(itemData.name.en as string)} from the last 20 days, newest to oldest:`;
  reply += newLine();

  let historyText = '```';

  const parseTime = d3.utcParse('%Y-%m-%d');

  let daysAgo = 1;
  for (const historyEntry of last20days) {
    historyText += newLine();
    let dayName = `${daysAgo} days ago`;
    if (daysAgo === 1) {
      dayName = `Yesterday`;
    }
    const parsedTime = parseTime(historyEntry.date) as Date;
    const dateText = d3.utcFormat('%a, %m-%d')(parsedTime);

    historyText += `${dateText}: ${formatNumber(historyEntry.average) + ` ISK`} (${dayName})`;
    daysAgo++;
  }

  historyText += '```';
  reply += historyText;

  const data = last20days.map((entry) => {
    return {
      x: parseTime(entry.date) as Date,
      y: entry.average
    };
  });

  const fileName = `data/${last20days[0].date}_${itemData.itemID}.png`;
  if (!fs.existsSync(fileName)) {
    const graph = createLineGraph(data, `Price history for ${itemData.name.en}`);
    await exportGraphImage(graph, fileName);
  }
  return {reply, itemData, regionName, fileName};
}
