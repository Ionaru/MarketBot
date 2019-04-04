import * as discord from 'discord.js';

import { createCommandRegex } from '../helpers/regex';
import { Command } from './command';

export class PriceCommand extends Command {

    public static test(command: string) {
        return PriceCommand.commandRegex.test(command);
    }

    private static readonly priceCommands = [
        'price', 'p', 'value',
    ];

    private static readonly commandRegex = createCommandRegex(PriceCommand.priceCommands, true);

    protected initialReply = `Checking price, one moment, ${this.message.sender}...`;
    protected commandName = PriceCommand.priceCommands[0];

    public execute() {
        return this.executeCommand();
    }

    protected async makeReply() {
        const embed = new discord.RichEmbed();
        this.reply.options = {embed};

        // TODO: Add command logic here.

        if (!(this.parsedMessage.item && this.parsedMessage.item.length)) {
            embed.addField('Error', 'You need to give me an item to search for.');
            return;
        }
    }
}
