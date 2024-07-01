import * as fs from "node:fs";

import type { IUniverseNamesDataUnit } from "@ionaru/eve-utils";
import { formatNumber } from "@ionaru/format-number";
import * as d3 from "d3";
import moment from "moment";
import {
    CommandContext,
    CommandOptionType,
    SlashCommand,
    SlashCreator,
} from "slash-create";

import { Message } from "../chat-service/discord/message";
import { fetchHistoryData } from "../helpers/api";
import { regions } from "../helpers/cache";
import { getCommand, logSlashCommand } from "../helpers/command-logger";
import { createLineGraph, exportGraphImage } from "../helpers/graph";
import {
    getGuessHint,
    guessItemInput,
    guessRegionInput,
    type IGuessReturn,
} from "../helpers/guessers";
import {
    itemFormat,
    newLine,
    regionFormat,
} from "../helpers/message-formatter";
import type { IParsedMessage } from "../typings.d";

interface IHistoryCommandLogicReturn {
    reply: string;
    itemData?: IUniverseNamesDataUnit;
    regionName?: string;
    fileName?: string;
}

export class HistoryCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description:
                "Show history information and a graph showing the average price in the last 20 days.",
            name: "history",
            options: [
                {
                    description: "The item to look up",
                    name: "item",
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    description: "The region to search in. Default: The Forge",
                    name: "region",
                    required: false,
                    type: CommandOptionType.STRING,
                },
            ],
        });
    }

    public async run(context: CommandContext): Promise<void> {
        await context.defer(false);

        const messageData: IParsedMessage = {
            content: getCommand(context),
            item: "",
            limit: 5,
            region: "",
            system: "",
            ...context.options,
        };

        const { reply, itemData, regionName, fileName } =
            await historyCommandLogic(messageData);

        if (fileName) {
            const file = fs.readFileSync(fileName);
            await context.send(reply, { file: { file, name: fileName } });
        } else {
            await context.send(reply);
        }

        logSlashCommand(
            context,
            itemData ? itemData.name : undefined,
            regionName ?? undefined,
        );
    }
}

const historyCommandLogic = async (
    messageData: IParsedMessage,
): Promise<IHistoryCommandLogicReturn> => {
    let regionName = "";
    let reply = "";

    if (!(messageData.item && messageData.item.length > 0)) {
        reply = "You need to give me an item to search for.";
        return { itemData: undefined, regionName, reply };
    }

    const { itemData, guess, id }: IGuessReturn = await guessItemInput(
        messageData.item,
    );

    reply += getGuessHint({ guess, id, itemData }, messageData.item);

    if (!itemData.id) {
        return { itemData: undefined, regionName, reply };
    }

    const defaultRegion = regions.find(
        (region) => region.name === "The Forge",
    )!;
    let selectedRegion = defaultRegion;

    if (messageData.region) {
        const guessResult = await guessRegionInput(messageData.region);
        selectedRegion = guessResult.itemData;
        if (!selectedRegion.id) {
            selectedRegion = defaultRegion;
            reply += `I don't know of the "${messageData.region}" region, defaulting to ${regionFormat(selectedRegion.name)}`;
            reply += newLine(2);
        }
    }

    regionName = selectedRegion.name;

    const historyData = await fetchHistoryData(itemData.id, selectedRegion.id);

    if (!historyData) {
        reply +=
            "My apologies, I was unable to fetch the required data from the web, please try again later.";
        return { itemData, regionName, reply };
    }

    if (historyData.length === 0) {
        reply = `I couldn't find any price history for ${itemFormat(itemData.name)}`;
        return { itemData, regionName, reply };
    }

    const twentyDaysAgo = moment().startOf("day").subtract(21, "days");
    const last20days = historyData
        .filter((historyEntry) =>
            moment(historyEntry.date).isAfter(twentyDaysAgo),
        )
        .reverse();

    if (last20days.length === 0) {
        reply = `There is no history data in the last 20 days for ${itemFormat(itemData.name)} in ${regionName}.`;
        return { itemData, regionName, reply };
    }

    reply += `Price history for ${itemFormat(itemData.name)} from the last 20 days, newest to oldest:`;
    reply += newLine();

    let historyText = "```";

    const parseTime = d3.utcParse("%Y-%m-%d");

    for (const historyEntry of last20days) {
        historyText += newLine();
        const dayName = moment(historyEntry.date).from(moment().startOf("day"));
        const parsedTime = parseTime(historyEntry.date) as Date;
        const dateText = d3.utcFormat("%a, %m-%d")(parsedTime);

        const price = formatNumber(historyEntry.average) + ` ISK`;
        historyText += `${dateText}: ${price} (${dayName})`;
    }

    historyText += "```";
    reply += historyText;

    const data = last20days.map((entry) => ({
        x: parseTime(entry.date) as Date,
        y: entry.average,
    }));

    const fileName = `data/${last20days[0].date}_${itemData.id}_${selectedRegion.id}.png`;
    if (!fs.existsSync(fileName)) {
        const graph = createLineGraph(
            data,
            `Price history for ${itemData.name}`,
            regionName,
        );
        try {
            await exportGraphImage(graph, fileName);
        } catch (error) {
            reply += newLine();
            const errorText =
                "I was unable to make a graph, hopefully the data above is useful to you";
            const caughtError =
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                error instanceof Error ? error : new Error(`${error}`);
            reply += Message.processError(
                caughtError,
                messageData.content,
                errorText,
            );
            return { itemData, regionName, reply };
        }
    }
    return { fileName, itemData, regionName, reply };
};
