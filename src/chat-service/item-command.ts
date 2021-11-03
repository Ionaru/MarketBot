import { IMarketGroupData } from '@ionaru/eve-utils';
import { formatNumber } from '@ionaru/format-number';

import { fetchCategory, fetchGroup, fetchMarketGroup, fetchPriceData, fetchUniverseType } from '../helpers/api';
import { getGuessHint, guessItemInput, IGuessReturn } from '../helpers/guessers';
import { makeCode, newLine } from '../helpers/message-formatter';
import { createCommandRegex } from '../helpers/regex';

import { Command } from './command';

export class ItemCommand extends Command {

    public static debug = Command.debug.extend('item');

    private static readonly commands = [
        'item', 'id', 'lookup',
    ];

    private static readonly commandRegex = createCommandRegex(ItemCommand.commands, true);

    protected initialReply = `Gathering information about the item, one moment, ${this.message.sender}...`;
    protected commandName = ItemCommand.commands[0];

    public static test(command: string) {
        this.debug(`Testing ${command}`);
        return this.commandRegex.test(command);
    }

    protected async isCommandValid() {

        if (!(this.parsedMessage.item && this.parsedMessage.item.length)) {
            this.embed.addField('Error', 'You need to give me an item to search for.');
            return false;
        }

        return true;
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
    protected async processCommand() {
        const {itemData, guess, id}: IGuessReturn = await guessItemInput(this.parsedMessage.item);

        const guessHint = getGuessHint({guess, id, itemData}, this.parsedMessage.item);
        if (guessHint) {
            this.embed.addField('Warning', guessHint);
        }

        if (!itemData.id) {
            this.embed.setThumbnail(`https://data.saturnserver.org/eve/Icons/items/74_64_14.png`);
            return;
        }

        this.logData.item = itemData.name;

        this.embed.setAuthor(itemData.name, `https://data.saturnserver.org/eve/Icons/UI/WindowIcons/info.png`);
        this.embed.setThumbnail(`https://image.eveonline.com/Type/${itemData.id}_64.png`);

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

        this.embed.addField('Item info', itemInfo);

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
            this.embed.addField('Market info', marketInfo);
        }
    }
}
