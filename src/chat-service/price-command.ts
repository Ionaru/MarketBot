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

        // TODO: Add command logic here.
        embed.addField('Warning', 'Wololo');

        this.reply.options = {embed};
    }
}
