import { IMarketGroupData } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';
import { MessageEmbed } from 'discord.js';
import { Transaction, startTransaction } from 'elastic-apm-node';
import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { fetchCategory, fetchGroup, fetchMarketGroup, fetchPriceData, fetchUniverseType } from '../helpers/api';
import { getCommand, logSlashCommand } from '../helpers/command-logger';
import { getGuessHint, guessItemInput, IGuessReturn } from '../helpers/guessers';
import { makeCode, newLine } from '../helpers/message-formatter';
import { IParsedMessage } from '../typings.d';

export class ItemCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description: 'Show some information about a specific item.',
            guildIDs: ['302014526201659392'],
            name: 'item',
            options: [
                {
                    description: 'The item to look up',
                    name: 'item',
                    required: true,
                    type: CommandOptionType.STRING,
                },
            ],
        });
    }

    public async run(context: CommandContext): Promise<void> {
        // eslint-disable-next-line no-null/no-null
        let transaction: Transaction | null = null;
        if (configuration.getProperty('elastic.enabled') === true) {
            transaction = startTransaction();
        }

        await context.defer(false);

        const messageData: IParsedMessage = {
            content: getCommand(context),
            item: '',
            limit: 5,
            region: '',
            system: '',
            ...context.options,
        };

        const {embed, itemData} = await itemCommandLogic(messageData);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await context.send({embeds: [embed]});
        logSlashCommand(context, (itemData ? itemData.name : undefined), undefined, transaction);
    }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
const itemCommandLogic = async (messageData: IParsedMessage) => {
    const {itemData, guess, id}: IGuessReturn = await guessItemInput(messageData.item);

    const embed = new MessageEmbed();

    const guessHint = getGuessHint({guess, id, itemData}, messageData.item);
    if (guessHint) {
        embed.addField('Warning', guessHint);
    }

    if (!itemData.id) {
        embed.setThumbnail(`https://data.saturnserver.org/eve/Icons/items/74_64_14.png`);
        return {embed, itemData};
    }

    embed.setAuthor(itemData.name, `https://data.saturnserver.org/eve/Icons/UI/WindowIcons/info.png`);
    embed.setThumbnail(`https://image.eveonline.com/Type/${itemData.id}_64.png`);

    const item = await fetchUniverseType(itemData.id);

    let itemInfo = '';
    itemInfo += `• ID: ${itemData.id}`;
    itemInfo += newLine();
    itemInfo += `• Name: ${itemData.name}`;
    itemInfo += newLine();
    if (item && item.group_id) {
        const group = await fetchGroup(item.group_id);
        if (group) {
            itemInfo += `• Group: ${group.name}`;
            itemInfo += newLine();

            if (group.category_id) {
                const category = await fetchCategory(group.category_id);
                if (category) {
                    itemInfo += `• Category: ${category.name}`;
                    itemInfo += newLine();
                }
            }
        }
    }

    if (item && item.volume) {
        const volume = formatNumber(item.volume, Infinity);
        itemInfo += `• Volume: ${makeCode(volume + ' m³')}`;
        itemInfo += newLine();
    }

    embed.addField('Item info', itemInfo);

    let marketInfo = '';
    if (item && item.market_group_id) {
        const marketGroups = [];
        let marketGroupId: number | undefined = item.market_group_id;
        while (marketGroupId !== undefined) {
            const marketGroup: IMarketGroupData | undefined = await fetchMarketGroup(marketGroupId);
            if (marketGroup) {
                marketGroups.unshift(marketGroup.name);
                marketGroupId = marketGroup.parent_group_id ? marketGroup.parent_group_id : undefined;
            }
        }

        marketInfo += `• Market location:`;
        const indent = ' > ';
        let deepness = 1;
        for (const marketGroup of marketGroups) {
            marketInfo += newLine();
            marketInfo += `${indent.repeat(deepness)}${marketGroup}`;
            deepness++;
        }

        const json = await fetchPriceData(itemData, 'jita');
        if (json) {
            const sellData = formatNumber(json.appraisal.items[0].prices.sell.percentile);
            const buyData = formatNumber(json.appraisal.items[0].prices.buy.percentile);
            marketInfo += newLine(2);
            marketInfo += `• Average Jita **sell** price: ${makeCode(sellData + ' ISK')}`;
            marketInfo += newLine();
            marketInfo += `• Average Jita **buy** price: ${makeCode(buyData + ' ISK')}`;
        }

        marketInfo += newLine();
    }

    if (marketInfo) {
        embed.addField('Market info', marketInfo);
    }

    return {embed, itemData};
};
