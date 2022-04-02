import { formatNumber } from '@ionaru/format-number';
import { MessageEmbed } from 'discord.js';
import { Transaction, startTransaction } from 'elastic-apm-node';
import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { fetchPriceData } from '../helpers/api';
import { getCommand, logSlashCommand } from '../helpers/command-logger';
import { getGuessHint, guessItemInput } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { IParsedMessage } from '../typings.d';

export class PriceCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description: 'Fetch the lowest and average prices for an item, both buy and sell orders.',
            name: 'price',
            options: [
                {
                    description: 'The item to look up',
                    name: 'item',
                    required: true,
                    type: CommandOptionType.STRING,
                },
                {
                    choices: [
                        { name: 'Jita', value: 'Jita' },
                        { name: 'Amarr', value: 'Amarr' },
                        { name: 'Dodixie', value: 'Dodixie' },
                        { name: 'Rens', value: 'Rens' },
                        { name: 'Hek', value: 'Hek' },
                    ],
                    description: 'The system to show prices for, default: Jita',
                    name: 'system',
                    required: false,
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
            system: 'Jita',
            ...context.options,
        };

        const {embed, itemData, systemName} = await priceCommandLogic(messageData);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await context.send({embeds: [embed]});
        logSlashCommand(context, (itemData ? itemData.name : undefined), (systemName ? systemName : undefined), transaction);
    }
}

const priceCommandLogic = async (messageData: IParsedMessage) => {
    const {itemData, guess, id} = await guessItemInput(messageData.item);

    const embed = new MessageEmbed();

    const guessHint = getGuessHint({guess, id, itemData}, messageData.item);
    if (guessHint) {
        embed.addField('Warning', guessHint);
    }

    if (!itemData.id) {
        embed.setThumbnail(`https://data.saturnserver.org/eve/Icons/items/74_64_14.png`);
        return {embed, itemData, systemName: messageData.system};
    }

    // this.logData.item = itemData.name;

    // const location = this.getMarket();

    const json = await fetchPriceData(itemData, messageData.system);

    if (!json) {
        embed.addField('Error', `My apologies, I was unable to fetch the required data from the web, please try again later.`);
        embed.setThumbnail(`https://data.saturnserver.org/eve/Icons/items/9_64_12.ZH.png`);
        return {embed, itemData, systemName: messageData.system};
    }

    const sellData = json.appraisal.items[0].prices.sell;
    const buyData = json.appraisal.items[0].prices.buy;

    const sellMeta: string[] = [
        formatNumber(json.appraisal.items[0].prices.sell.order_count, 0) + ' orders',
        formatNumber(json.appraisal.items[0].prices.sell.volume, 0) + ' items',
    ];
    const buyMeta: string[] = [
        formatNumber(json.appraisal.items[0].prices.buy.order_count, 0) + ' orders',
        formatNumber(json.appraisal.items[0].prices.buy.volume, 0) + ' items',
    ];

    let sellPrice = 'unknown';
    let lowestSellPrice = 'unknown';
    if (sellData.percentile && sellData.order_count !== 0) {
        sellPrice = formatNumber(sellData.percentile) + ' ISK';
        lowestSellPrice = formatNumber(sellData.min) + ' ISK';
    }

    let buyPrice = 'unknown';
    let highestBuyPrice = 'unknown';
    if (buyData.percentile && buyData.order_count !== 0) {
        buyPrice = formatNumber(buyData.percentile) + ' ISK';
        highestBuyPrice = formatNumber(buyData.max) + ' ISK';
    }

    if (sellPrice === 'unknown' && buyPrice === 'unknown') {
        const itemName = itemFormat(itemData.name);
        const replyText = `I couldn't find any price information for ${itemName} in ${regionFormat(messageData.system)}, sorry.`;
        embed.addField('No data', replyText);
        return {embed, itemData, systemName: messageData.system};
    }

    embed.setAuthor(itemData.name, `https://data.saturnserver.org/eve/Icons/UI/WindowIcons/wallet.png`);
    embed.setDescription(`Price information for ${regionFormat(messageData.system)}`);
    embed.setThumbnail(`https://image.eveonline.com/Type/${itemData.id}_64.png`);

    let sellInfo = '';
    if (sellPrice !== 'unknown') {
        sellInfo += `• Lowest: ${itemFormat(lowestSellPrice)}` + newLine();
        sellInfo += `• Average: ${itemFormat(sellPrice)}` + newLine();
    } else {
        sellInfo += '• Sell price data is unavailable' + newLine();
    }
    embed.addField(`Sell ( ${sellMeta.join(', ')} )`, sellInfo);

    let buyInfo = '';
    if (buyPrice !== 'unknown') {
        buyInfo += `• Highest: ${itemFormat(highestBuyPrice)}` + newLine();
        buyInfo += `• Average: ${itemFormat(buyPrice)}` + newLine();
    } else {
        buyInfo += '• Buy price data is unavailable' + newLine();
    }
    embed.addField(`Buy ( ${buyMeta.join(', ')} )`, buyInfo);

    return {embed, itemData, systemName: messageData.system};
};
