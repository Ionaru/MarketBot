import { logger } from 'winston-pnp-logger';

import { Message } from './discord/message';
import { IParsedMessage } from '../typings';
import { commandPrefix, limitCommandRegex, regionCommandRegex, systemCommandRegex } from '../market-bot';

export abstract class Command {

    public static commandPrefix = '/';

    public static test(message: string) {
        return message.startsWith(Command.commandPrefix);
    }

    protected message: Message;
    protected parsedMessage: IParsedMessage;

    constructor(message: Message) {
        this.message = message;
        this.parseMessage();
        logger.info(message.content);
    }

    protected parseMessage() {
        const parsedMessage: IParsedMessage = {
            content: this.message.content,
            item: '',
            limit: 0,
            region: '',
            system: '',
        };

        let contentToParse = this.message.content;

        // Remove double spaces because that confuses the input guessing system
        let messageText = contentToParse.replace(/ +(?= )/g, '');
        // let messageWords: string[];

        // Split the message into separate words and remove the first word (the command tag)
        // messageWords = messageText.split(' ');
        // messageWords.shift();
        //
        // if (messageWords) {
        //     messageText = messageWords.join(' ');
        // }

        messageText = Command.removeCommandFromMessage(messageText);

        parsedMessage.item = Command.getItemText(messageText);

        // Search for the item text
        let itemText = messageText;
        if (itemText.indexOf(Command.commandPrefix) !== -1) {
            itemText = itemText.substring(0, itemText.indexOf(Command.commandPrefix)).trim();
        }
        parsedMessage.item = itemText;

        // Search for the region text
        const regionMatch = messageText.match(regionCommandRegex);
        if (regionMatch && regionMatch.index) {
            let sep1 = messageText.substring(regionMatch.index + regionMatch[0].length).trim();
            if (sep1.indexOf(Command.commandPrefix) !== -1) {
                sep1 = sep1.substring(0, sep1.indexOf(Command.commandPrefix)).trim();
            }
            parsedMessage.region = sep1;
        }

        // Search for the system text
        const systemMatch = messageText.match(systemCommandRegex);
        if (systemMatch && systemMatch.index) {
            let sep1 = messageText.substring(systemMatch.index + systemMatch[0].length).trim();
            if (sep1.indexOf(Command.commandPrefix) !== -1) {
                sep1 = sep1.substring(0, sep1.indexOf(Command.commandPrefix)).trim();
            }
            parsedMessage.system = sep1;
        }

        // Search for the limit text
        const limitMatch = messageText.match(limitCommandRegex);
        if (limitMatch && limitMatch.index) {
            let sep1 = messageText.substring(limitMatch.index + limitMatch[0].length).trim();
            if (sep1.indexOf(Command.commandPrefix) !== -1) {
                sep1 = sep1.substring(0, sep1.indexOf(Command.commandPrefix)).trim();
            }
            parsedMessage.limit = Number(sep1);
        }

        console.log(parsedMessage);

        return parsedMessage;
    }

    private static removeCommandFromMessage(message: string) {
        const messageWords = message.split(' ');
        messageWords.shift();
        return messageWords.join(' ');
    }

    private static getItemText(message: string) {
        const nextCommandPartLocation = message.indexOf(Command.commandPrefix);
        if (nextCommandPartLocation !== -1) {
            message = message.substring(0, nextCommandPartLocation);
        }
        return message.trim();
    }
}
