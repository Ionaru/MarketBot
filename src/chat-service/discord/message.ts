import * as Discord from 'discord.js';

import { makeBold, makeCode, makeURL, newLine } from '../../helpers/message-formatter';
import { creator } from '../../market-bot';
import { maxMessageLength } from './misc';

interface IServer {
    id?: string;
    name?: string;
}

type channelType = 'dm' | 'text' | 'voice' | 'group' | 'category' | 'news' | 'store';

export class Message {

    public static processError(caughtError: Error, command: string, errorText = `I'm sorry, it appears I have developed a fault`) {
        const time = Date.now();
        process.stderr.write(`Caught error @ ${time} \n${caughtError}\n`);
        process.stderr.write(`Error triggered by command: \n${command}\n`);
        let text = `${errorText}.`;
        text += newLine();
        text += `Please let ${makeCode(creator)} (${makeURL('https://discord.gg/k9tAX94')}) know about this error.`;
        text += newLine(2);
        const errorMessage = `${caughtError.message} @ ${time}`;
        text += `Technical information: ${makeCode(errorMessage)}`;
        return text;
    }

    public readonly sender: string;
    public readonly origin: string;
    public readonly author: { id: string, name: string };
    public readonly channel: { id: string, name?: string, type: channelType };
    public readonly server: IServer;
    public readonly content: string;
    public readonly id: string;

    private discordMessage: Discord.Message;

    constructor(message: Discord.Message) {
        this.discordMessage = message;
        this.sender = message.author.username;
        this.content = message.content;
        this.id = message.id;
        this.author = {
            id: message.author.id,
            name: message.author.tag,
        };
        this.channel = {
            id: message.channel.id,
            name: undefined,
            type: message.channel.type,
        };

        this.server = {
            id: undefined,
            name: undefined,
        };

        if (message.guild) {
            this.server.id = message.guild.id;
            this.server.name = message.guild.name;
        }

        if (message.channel.type !== 'dm') {
            const channel = message.channel as Discord.TextChannel;
            this.channel.name = channel.name;
        }

        this.origin = 'Discord';
    }

    get guild(): Discord.Guild | undefined {
        if (this.discordMessage.channel.type === 'text') {
            const channel = this.discordMessage.channel as Discord.TextChannel;
            return channel.guild;
        }

        return undefined;
    }

    public async reply(message: string, options: Discord.MessageOptions = {}): Promise<Message> {
        if (message.length > maxMessageLength) {
            throw new Error('MaxMessageLengthReached');
        }
        const sent: any = await this.discordMessage.channel.send(message, options);
        return new Message(sent[0] || sent);
    }

    public async sendError(caughtError: Error) {
        let replyMessage = '';

        if (caughtError.message === 'Missing Permissions') {
            replyMessage += makeBold('ERROR');
            replyMessage += newLine();
            replyMessage += `I do not have enough chat permissions to send a reply for this command,`;
            replyMessage += newLine();
            replyMessage += `please check ${makeURL('https://ionaru.github.io/MarketBot/permissions/')} for the permissions I need.`;

        } else {
            replyMessage = Message.processError(caughtError, this.content);
        }

        this.reply(replyMessage)
            .then().catch(async (error: Discord.DiscordAPIError) => {
            process.stderr.write(`Unable to send error message to channel '${this.channel.name} (${this.channel.id})'\n`);
            if (error.stack) {
                process.stderr.write(error.stack.toString() + '\n');
            } else {
                process.stderr.write(error.toString() + '\n');
            }
        });
    }

    public async edit(message: string, options: Discord.MessageOptions = {}): Promise<void> {
        if (message.length > maxMessageLength) {
            throw new Error('MaxMessageLengthReached');
        }
        await this.discordMessage.edit(message, options);
    }

    public async remove(timeout?: number): Promise<boolean> {
        try {
            await this.discordMessage.delete(timeout);
            return true;
        } catch {
            return false;
        }
    }
}
