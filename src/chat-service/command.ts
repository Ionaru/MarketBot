import * as discord from 'discord.js';
import { startTransaction } from 'elastic-apm-node';

import { logCommand } from '../helpers/command-logger';
import { configuration, debug } from '../index';
import { limitCommandRegex, regionCommandRegex, systemCommandRegex } from '../market-bot';
import { INamesData, IParsedMessage } from '../typings';
import { Message } from './discord/message';

export abstract class Command {

    public static commandPrefix = '/';

    public static test(message: string) {
        Command.debug(`Testing ${message}`);
        return message.startsWith(Command.commandPrefix);
    }

    protected static debug = debug.extend('command');

    protected static parseMessage(messageContent: string) {
        const parsedMessage: IParsedMessage = {
            content: messageContent,
            item: '',
            limit: 0,
            region: '',
            system: '',
        };

        // Remove double spaces because that confuses the input guessing system
        let messageText = messageContent.replace(/ +(?= )/g, '');

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

    protected message: Message;
    protected parsedMessage: IParsedMessage;
    protected reply: {text?: string, options?: discord.MessageOptions} = {};

    // Members that all derivative classes must implement.
    protected abstract initialReply: string;
    protected abstract commandName: string;

    private readonly transaction: any;
    private replyPlaceHolder?: Message;

    constructor(message: Message) {
        this.message = message;
        this.parsedMessage = Command.parseMessage(message.content);

        Command.debug(message.content);

        if (configuration.getProperty('elastic.enabled') === true) {
            Command.debug(`Starting elastic transaction`);
            this.transaction = startTransaction();
        }
    }

    protected abstract async makeReply(): Promise<void>;

    protected async sendInitialReply() {
        Command.debug(`Sending initial reply`);
        this.replyPlaceHolder = await this.message.reply(this.initialReply);
    }

    protected async sendReply(reply: string, options: discord.MessageOptions) {
        if (this.replyPlaceHolder) {
            Command.debug(`Editing initial reply`);
            return this.replyPlaceHolder.edit(reply, options);
        }
        Command.debug(`Sending reply`);
        return this.message.reply(reply, options);
    }

    protected logCommand(itemData?: INamesData, locationName?: string) {
        const itemName = itemData ? itemData.name : undefined;
        logCommand(this.commandName, this.message, itemName, locationName, this.transaction);
    }

    protected async executeCommand() {
        await this.sendInitialReply();
        await this.makeReply();
        await this.sendReply(this.reply.text || '', this.reply.options || {});
        // this.logCommand('price');
    }
}
