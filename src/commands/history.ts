import * as d3 from 'd3';
// import * as fs from 'fs';
// import * as path from 'path';
// import * as d3nLine from 'd3node-linechart';
// import * as output from 'd3node-output';
// const output = require('d3node-output');
import { Message } from '../chat-service/discord/message';
import { fetchHistoryData } from '../helpers/api';
// import { fetchPriceData } from '../helpers/api';
import { logCommand } from '../helpers/command-logger';
import { formatNumber } from '../helpers/formatters';
// import { formatNumber } from '../helpers/formatters';
import { guessUserItemInput, guessUserRegionInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { regionList } from '../regions';
import { createLineGraph, exportGraphImage } from '../helpers/graph';

// import { IPriceData } from '../typings';

export async function historyFunction(message: Message) {

  const messageData = parseMessage(message.content);

  const replyPlaceholder = await message.reply(
    `Checking history, one moment, ${message.sender}...`
  );

  let reply = '';
  let regionName = '';

  if (!(messageData.item && messageData.item.length)) {
    reply = 'You need to give me an item to search for.';
    return replyPlaceholder.edit(reply);
  }

  const {itemData, guess}: IGuessReturn = guessUserItemInput(messageData.item);

  if (!itemData) {
    reply += `I don't know what you mean with "${messageData.item}" 😟`;
    return {reply, itemData: undefined, regionName};
  }

  if (guess) {
    reply += `"${messageData.item}" didn't directly match any item I know of, my best guess is ${itemFormat(itemData.name.en as string)}`;
    reply += newLine(2);
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
  const last20days = historyData.slice(-20).reverse();
  // console.log(historyData.slice(-20));
  reply += 'History data from the last 20 days, oldest to newest:';
  reply += newLine();

  let daysAgo = 1;
  for (const historyEntry of last20days) {
    reply += newLine();
    let dayName = `${daysAgo} days ago`;
    if (daysAgo === 1) {
      dayName = `Yesterday`;
    }
    reply += `${dayName} (${historyEntry.date}): ${itemFormat(formatNumber(historyEntry.average)) + ` ISK`}`;
    daysAgo++;
  }

  // const parseTime = d3.utcParse('%Y-%m-%dT%H:%M:%S:%LZ');
  const parseTime = d3.utcParse('%Y-%m-%d');
  // const formatTime = d3.timeF('%Y-%m-%d');
  // console.log(`Reading typeIDs from '${path.join(process.cwd(), 'data.tsv')}'`);
  // const tsvString = fs.readFileSync('./data.tsv').toString();
  // const data = d3.tsvParse(tsvString, (d) => {
  //   return {
  //     key: parseTime(d.date),
  //     value: +d.close
  //   };
  // });

  // new Date(new Date(last20days[0].date).setUTCHours(12))

  // parseTime(new Date(last20days[0].date).setUTCHours(0))
  // new Date(last20days[0].date).setUTCHours(0)

  const data = last20days.map((entry) => {
    // const date = new Date(entry.date);
    // console.log('');
    // date.setUTCHours(0);
    // console.log(date.toISOString());
    // console.log(parseTime(date.toISOString()));
    // console.log(date.getTime());
    // console.log(parseTime(date.getTime().toString()));

    return {
      x: parseTime(entry.date) as Date,
      y: entry.average
    };
  });

  const graph = createLineGraph(data);
  await exportGraphImage(graph, 'output.png');
  // console.log(graph);

  // const chartContainer = `<div id="container"><h2>Average price of ${itemData.name.en}</h2><div id="chart"></div></div>`;

// create output files
//   output('output', d3nLine({
//     container: chartContainer,
//     data,
//     isCurve: false,
//     margin: {top: 20, right: 75, bottom: 20, left: 75}
//   }));

  // const itemId = itemData.itemID;

  // const json = await fetchPriceData(itemId, regionId);
  //
  // if (!(json && json.length)) {
  //   reply += `My apologies, I was unable to fetch the required data from the web, please try again later.`;
  //   return replyPlaceholder.edit(reply);
  // }

  // const sellData: IPriceData = json[0].sell;
  // const buyData: IPriceData = json[0].buy;
  //
  // let sellPrice = 'unknown';
  // let lowestSellPrice = 'unknown';
  // if (sellData.fivePercent && sellData.fivePercent !== 0) {
  //   sellPrice = formatNumber(sellData.fivePercent) + ' ISK';
  //   lowestSellPrice = formatNumber(sellData.min) + ' ISK';
  // }
  //
  // let buyPrice = 'unknown';
  // let highestBuyPrice = 'unknown';
  // if (buyData.fivePercent && buyData.fivePercent !== 0) {
  //   buyPrice = formatNumber(buyData.fivePercent) + ' ISK';
  //   highestBuyPrice = formatNumber(buyData.max) + ' ISK';
  // }
  //
  // if (sellPrice === 'unknown' && buyPrice === 'unknown') {
  //   reply += `I couldn't find any price information for ${itemFormat(itemData.name.en as string)} in ${regionFormat(regionName)}, sorry.`;
  //   return replyPlaceholder.edit(reply);
  // }
  //
  // reply += `Price information for ${itemFormat(itemData.name.en as string)} in ${regionFormat(regionName)}:` + newLine(2);
  //
  // if (sellPrice !== 'unknown') {
  //   reply += `- Lowest selling price is ${itemFormat(lowestSellPrice)}` + newLine();
  //   reply += `- Average selling price is ${itemFormat(sellPrice)}` + newLine();
  // } else {
  //   reply += '- Selling price data is unavailable' + newLine();
  // }
  //
  // reply += newLine();
  // if (buyPrice !== 'unknown') {
  //   reply += `- Highest buying price is ${itemFormat(highestBuyPrice)}` + newLine();
  //   reply += `- Average buying price is ${itemFormat(buyPrice)}` + newLine();
  // } else {
  //   reply += '- Buying price data is unavailable' + newLine();
  // }

  await replyPlaceholder.reply(reply, {
    files: ['output.png']
  });
  logCommand('price', message, (itemData ? itemData.name.en : undefined), (regionName ? regionName : undefined));
}
