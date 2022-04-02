import { Transaction, startTransaction } from 'elastic-apm-node';
import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { version } from '../../package.json';
import { logSlashCommand } from '../helpers/command-logger';
import { makeBold, makeCode, makeURL, newLine } from '../helpers/message-formatter';
import { botName, client, creator as botCreator } from '../market-bot';


export class InfoCommand extends SlashCommand {
    public constructor(creator: SlashCreator) {
        super(creator, {
            description: 'Print a message with information about the bot, and how to use it.',
            guildIDs: ['302014526201659392'],
            name: 'info',
        });
    }

    public async run(context: CommandContext): Promise<void> {
        // eslint-disable-next-line no-null/no-null
        let transaction: Transaction | null = null;
        if (configuration.getProperty('elastic.enabled') === true) {
            transaction = startTransaction();
        }

        await context.defer(false);

        const reply = await infoCommandLogic();

        await context.send(reply);
        logSlashCommand(context, undefined, undefined, transaction);
    }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
const infoCommandLogic = async () => {
    let reply = makeBold(`Greetings, I am ${botName}!`);

    if (client) {
        const name = client.name;

        if (name !== botName) {
            reply += newLine();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            reply += `You may know me as ${makeBold(name!)} in this channel.`;
        }
    }

    reply += newLine(2);
    reply += `I was created by ${makeCode(botCreator)} to fetch information from the EVE Online market and provide you with accurate `;
    reply += `price information.`;
    reply += newLine();
    reply += `The data I use comes from the EVE Swagger Interface provided by CCP, as well as `;
    reply += `the EVEMarketer and stop.hammerti.me.uk APIs created by some amazing third-party developers.`;
    reply += newLine(2);
    reply += makeBold('Commands');
    reply += newLine();
    reply += `To learn which commands you can give me, look on this web page:`;
    reply += newLine();
    reply += makeURL('https://ionaru.github.io/MarketBot/commands/');
    reply += newLine(2);
    reply += makeBold('Permissions');
    reply += newLine();
    reply += `To function correctly, I need the right set of permissions in Discord, you can find them on this web page:`;
    reply += newLine();
    reply += makeURL('https://ionaru.github.io/MarketBot/permissions/');
    reply += newLine(2);
    reply += makeBold('More information');
    reply += newLine();
    reply += `You can find information like source code, command aliases, self-hosting, logging and new features on `;
    reply += makeURL('https://ionaru.github.io/MarketBot/');
    reply += newLine(2);
    reply += makeBold('Version');
    reply += newLine();

    reply += `My current version is ${makeCode(version)}.`;

    return reply;
};
