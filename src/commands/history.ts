import { IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';
import * as d3 from 'd3';
import * as fs from 'fs';
import moment from 'moment';

import { Message } from '../chat-service/discord/message';
import { fetchHistoryData } from '../helpers/api';
import { regions } from '../helpers/cache';
import { logCommand } from '../helpers/command-logger';
import { createLineGraph, exportGraphImage } from '../helpers/graph';
import { getGuessHint, guessItemInput, guessRegionInput, IGuessReturn } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { parseMessage } from '../helpers/parsers';
import { IParsedMessage } from '../typings';

interface IHistoryCommandLogicReturn {
    reply: string;
    itemData?: IUniverseNamesDataUnit;
    regionName?: string;
    fileName?: string;
}

export async function historyCommand(message: Message, transaction: any) {
    const messageData = parseMessage(message.content);

    const replyPlaceHolder = await message.reply(`Checking history, one moment, ${message.sender}...`);

    const {reply, itemData, regionName, fileName} = await historyCommandLogic(messageData);

    const replyOptions = fileName ? {files: [fileName]} : undefined;
    await replyPlaceHolder.reply(reply, replyOptions);
    replyPlaceHolder.remove().then();

    logCommand('history', message, (itemData ? itemData.name : undefined), (regionName ? regionName : undefined), transaction);
}

async function historyCommandLogic(messageData: IParsedMessage): Promise<IHistoryCommandLogicReturn> {

    let regionName = '';
    let reply = '';

    if (!(messageData.item && messageData.item.length)) {
        reply = 'You need to give me an item to search for.';
        return {reply, itemData: undefined, regionName};
    }

    const {itemData, guess, id}: IGuessReturn = await guessItemInput(messageData.item);

    reply += getGuessHint({itemData, guess, id}, messageData.item);

    if (!itemData.id) {
        return {reply, itemData: undefined, regionName};
    }

    const defaultRegion = regions.find((region) => region.name === 'The Forge')!;
    let selectedRegion = defaultRegion;

    if (messageData.region) {
        selectedRegion = (await guessRegionInput(messageData.region)).itemData;
        if (!selectedRegion.id) {
            selectedRegion = defaultRegion;
            reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(selectedRegion.name)}`;
            reply += newLine(2);
        }
    }

    regionName = selectedRegion.name;

    const historyData = await fetchHistoryData(itemData.id, selectedRegion.id);

    if (!historyData) {
        reply += 'My apologies, I was unable to fetch the required data from the web, please try again later.';
        return {reply, itemData, regionName};
    }

    if (!historyData.length) {
        reply = `I couldn't find any price history for ${itemFormat(itemData.name)}`;
        return {reply, itemData, regionName};
    }

    const twentyDaysAgo = moment().startOf('day').subtract(21, 'days');
    const last20days = historyData.filter((historyEntry) => moment(historyEntry.date).isAfter(twentyDaysAgo)).reverse();

    if (!last20days.length) {
        reply = `There is no history data in the last 20 days for ${itemFormat(itemData.name)} in ${regionName}.`;
        return {reply, itemData, regionName};
    }

    reply += `Price history for ${itemFormat(itemData.name)} from the last 20 days, newest to oldest:`;
    reply += newLine();

    let historyText = '```';

    const parseTime = d3.utcParse('%Y-%m-%d');

    for (const historyEntry of last20days) {
        historyText += newLine();
        const dayName = moment(historyEntry.date).from(moment().startOf('day'));
        const parsedTime = parseTime(historyEntry.date) as Date;
        const dateText = d3.utcFormat('%a, %m-%d')(parsedTime);

        const price = formatNumber(historyEntry.average) + ` ISK`;
        historyText += `${dateText}: ${price} (${dayName})`;
    }

    historyText += '```';
    reply += historyText;

    const data = last20days.map((entry) => {
        return {
            x: parseTime(entry.date) as Date,
            y: entry.average,
        };
    });

    const fileName = `data/${last20days[0].date}_${itemData.id}_${selectedRegion.id}.png`;
    if (!fs.existsSync(fileName)) {
        const graph = createLineGraph(data, `Price history for ${itemData.name}`, regionName);
        try {
            await exportGraphImage(graph, fileName);
        } catch (error) {
            reply += newLine();
            const errorText = 'I was unable to make a graph, hopefully the data above is useful to you';
            reply += Message.processError(error, messageData.content, errorText);
            return {reply, itemData, regionName};
        }
    }
    return {reply, itemData, regionName, fileName};
}
