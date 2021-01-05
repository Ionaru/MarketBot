import { MessageEditOptions, MessageEmbed, MessageOptions } from 'discord.js';
import { startTransaction } from 'elastic-apm-node';

import { logCommand } from '../helpers/command-logger';
import { configuration, debug } from '../index';
import { limitCommandRegex, regionCommandRegex, systemCommandRegex } from '../market-bot';
import { IParsedMessage } from '../typings';
import { Message } from './discord/message';

export abstract class Command {

    private static readonly allowedMarkets = ['Jita', 'Amarr', 'Dodixie', 'Hek', 'Rens'];

    public static readonly commandPrefix = '/';

    public static test(message: string) {
        Command.debug(`Testing ${message}`);
        return message.startsWith(Command.commandPrefix);
    }

    // TODO: Change back to protected when all commands are re-written.
    // tslint:disable-next-line:member-ordering
    public static readonly debug = debug.extend('command');

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

    protected readonly message: Message;
    protected readonly parsedMessage: IParsedMessage;
    protected readonly reply: {text?: string, options?: MessageOptions | MessageEditOptions} = {};
    protected readonly embed: MessageEmbed = new MessageEmbed();

    protected readonly logData: {item?: string, location?: string} = {};

    // Members that all derivative classes must implement.
    protected abstract readonly initialReply?: string;
    protected abstract readonly commandName: string;

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

    public async execute() {
        await this.sendInitialReply();

        if (!this.embed) {
            throw new Error('Embed creation failed.');
        }

        this.reply.options = {embed: this.embed};

        if (await this.isCommandValid()) {
            await this.processCommand();
        }

        await this.sendReply();
        this.logCommand();
    }

    protected abstract isCommandValid(): Promise<boolean>;
    protected abstract processCommand(): Promise<void>;

    protected async sendInitialReply() {
        if (this.initialReply) {
            Command.debug(`Sending initial reply`);
            this.replyPlaceHolder = await this.message.reply(this.initialReply);
        }
    }

    protected async sendReply() {

        const reply = this.reply.text || '';
        const options = this.reply.options || {};

        if (this.replyPlaceHolder) {
            Command.debug(`Editing initial reply`);
            return this.replyPlaceHolder.edit(reply, options as MessageEditOptions);
        }

        Command.debug(`Sending reply`);
        return this.message.reply(reply, options as MessageOptions);
    }

    protected logCommand() {
        logCommand(this.commandName, this.message, this.logData.item, this.logData.location, this.transaction);
    }

    protected getMarket(): string {
        const defaultLocation = 'Jita';
        this.logData.location = defaultLocation;

        if (this.parsedMessage.region) {
            this.embed.addField('Warning',
                `The '/region' parameter is no longer supported, please use '/system' with one of the following values:
                ${Command.allowedMarkets.join(', ')}.
                Alternatively use the '/sell' or '/buy' commands.`,
            );
        }

        if (this.parsedMessage.system) {
            if (!Command.allowedMarkets.map(market => market.toLowerCase()).includes(this.parsedMessage.system)) {
                this.embed.addField('Warning',
                    `Use '/system' with one of the following values:
                    ${Command.allowedMarkets.join(', ')}.`,
                );
                return defaultLocation;
            }

            this.logData.location = this.parsedMessage.system;
            return this.parsedMessage.system.charAt(0).toUpperCase() + this.parsedMessage.system.slice(1);
        }

        return defaultLocation;
    }
}
