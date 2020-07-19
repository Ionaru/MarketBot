import { formatNumber } from '@ionaru/format-number';

import { fetchPriceData } from '../helpers/api';
import { getGuessHint, guessItemInput } from '../helpers/guessers';
import { itemFormat, newLine, regionFormat } from '../helpers/message-formatter';
import { createCommandRegex } from '../helpers/regex';
import { Command } from './command';

export class PriceCommand extends Command {

    public static debug = Command.debug.extend('price');

    public static test(command: string) {
        PriceCommand.debug(`Testing ${command}`);
        return PriceCommand.commandRegex.test(command);
    }

    private static readonly commands = [
        'price', 'p', 'value',
    ];

    private static readonly commandRegex = createCommandRegex(PriceCommand.commands, true);

    protected initialReply = `Checking price, one moment, ${this.message.sender}...`;
    protected commandName = PriceCommand.commands[0];

    protected async isCommandValid() {

        if (!(this.parsedMessage.item && this.parsedMessage.item.length)) {
            this.embed.addField('Error', 'You need to give me an item to search for.');
            return false;
        }

        return true;
    }

    protected async processCommand() {
        const {itemData, guess, id} = await guessItemInput(this.parsedMessage.item);

        const guessHint = getGuessHint({itemData, guess, id}, this.parsedMessage.item);
        if (guessHint) {
            this.embed.addField('Warning', guessHint);
        }

        if (!itemData.id) {
            this.embed.setThumbnail(`https://data.saturnserver.org/eve/Icons/items/74_64_14.png`);
            return;
        }

        this.logData.item = itemData.name;

        const location = this.getMarket();

        const json = await fetchPriceData(itemData, location);

        if (!json) {
            this.embed.addField('Error', `My apologies, I was unable to fetch the required data from the web, please try again later.`);
            this.embed.setThumbnail(`https://data.saturnserver.org/eve/Icons/items/9_64_12.ZH.png`);
            return;
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
            const replyText = `I couldn't find any price information for ${itemName} in ${regionFormat(location)}, sorry.`;
            this.embed.addField('No data', replyText);
            return;
        }

        this.embed.setAuthor(itemData.name, `https://data.saturnserver.org/eve/Icons/UI/WindowIcons/wallet.png`);
        this.embed.setDescription(`Price information for ${regionFormat(location)}`);
        this.embed.setThumbnail(`https://image.eveonline.com/Type/${itemData.id}_64.png`);

        let sellInfo = '';
        if (sellPrice !== 'unknown') {
            sellInfo += `• Lowest: ${itemFormat(lowestSellPrice)}` + newLine();
            sellInfo += `• Average: ${itemFormat(sellPrice)}` + newLine();
        } else {
            sellInfo += '• Sell price data is unavailable' + newLine();
        }
        this.embed.addField(`Sell ( ${sellMeta.join(', ')} )`, sellInfo);

        let buyInfo = '';
        if (buyPrice !== 'unknown') {
            buyInfo += `• Highest: ${itemFormat(highestBuyPrice)}` + newLine();
            buyInfo += `• Average: ${itemFormat(buyPrice)}` + newLine();
        } else {
            buyInfo += '• Buy price data is unavailable' + newLine();
        }
        this.embed.addField(`Buy ( ${buyMeta.join(', ')} )`, buyInfo);
    }
}
