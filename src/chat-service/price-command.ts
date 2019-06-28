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

    private static readonly priceCommands = [
        'price', 'p', 'value',
    ];

    private static readonly commandRegex = createCommandRegex(PriceCommand.priceCommands, true);

    protected initialReply = `Checking price, one moment, ${this.message.sender}...`;
    protected commandName = PriceCommand.priceCommands[0];

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

        const location = await this.getLocation(true);

        const json = await fetchPriceData(itemData.id, location.id);

        if (!(json && json.length)) {
            this.embed.addField('Error', `My apologies, I was unable to fetch the required data from the web, please try again later.`);
            this.embed.setThumbnail(`https://data.saturnserver.org/eve/Icons/items/9_64_12.ZH.png`);
            return;
        }

        const sellData = json[0].sell;
        const buyData = json[0].buy;

        let sellPrice = 'unknown';
        let lowestSellPrice = 'unknown';
        if (sellData.fivePercent && sellData.fivePercent !== 0) {
            sellPrice = formatNumber(sellData.wavg) + ' ISK';
            lowestSellPrice = formatNumber(sellData.fivePercent) + ' ISK';
        }

        let buyPrice = 'unknown';
        let highestBuyPrice = 'unknown';
        if (buyData.fivePercent && buyData.fivePercent !== 0) {
            buyPrice = formatNumber(buyData.wavg) + ' ISK';
            highestBuyPrice = formatNumber(buyData.fivePercent) + ' ISK';
        }

        if (sellPrice === 'unknown' && buyPrice === 'unknown') {
            const itemName = itemFormat(itemData.name);
            const replyText = `I couldn't find any price information for ${itemName} in ${regionFormat(location.name)}, sorry.`;
            this.embed.addField('No data', replyText);
            return;
        }

        this.embed.setAuthor(itemData.name, `https://data.saturnserver.org/eve/Icons/UI/WindowIcons/wallet.png`);
        this.embed.setDescription(`Price information for ${regionFormat(location.name)}`);
        this.embed.setThumbnail(`https://image.eveonline.com/Type/${itemData.id}_64.png`);

        let sellInfo = '';
        if (sellPrice !== 'unknown') {
            sellInfo += `* Lowest selling price is ${itemFormat(lowestSellPrice)}` + newLine();
            sellInfo += `* Average selling price is ${itemFormat(sellPrice)}` + newLine();
        } else {
            sellInfo += '* Selling price data is unavailable' + newLine();
        }
        this.embed.addField('Sell', sellInfo);

        let buyInfo = '';
        if (buyPrice !== 'unknown') {
            buyInfo += `* Highest buying price is ${itemFormat(highestBuyPrice)}` + newLine();
            buyInfo += `* Average buying price is ${itemFormat(buyPrice)}` + newLine();
        } else {
            buyInfo += '* Buying price data is unavailable' + newLine();
        }
        this.embed.addField('Buy', buyInfo);
    }
}
