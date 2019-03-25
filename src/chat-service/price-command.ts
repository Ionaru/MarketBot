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

    public execute() {
        this.parseMessage();
        console.log('Moo');
    }
}
