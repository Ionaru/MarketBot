import * as Discord from 'discord.js';
import { logger } from 'winston-pnp-logger';

import { makeBold, makeCode, makeURL, newLine } from '../../helpers/message-formatter';
import { creator } from '../../market-bot';
import { maxMessageLength } from './misc';

export class Message {

  public static processError(caughtError: Error, command: string, errorText = `I'm sorry, it appears I have developed a fault`) {
    const time = Date.now();
    logger.error(`Caught error @ ${time}` + newLine(), caughtError);
    logger.error(`Error triggered by command:`, command);
    let text = `${errorText}.`;
    text += newLine();
    text += `Please let ${makeCode(creator)} (${makeURL('https://discord.gg/k9tAX94')}) know about this error.`;
    text += newLine(2);
    text += `Technical information: ${makeCode(`${caughtError.message} @ ${time}`)}`;
    return text;
  }

  public _message: Discord.Message;
  private readonly _origin: string;
  private readonly _sender: string;
  private readonly _author: { id: string, name: string };
  private readonly _channel: { id: string, name: string | undefined, type: 'dm' | 'text' | 'voice' | 'group' | 'category' };
  private readonly _server: { id: string | undefined, name: string | undefined };
  private readonly _content: string;
  private readonly _id: string;

  constructor(message: Discord.Message) {
    this._message = message;
    this._sender = message.author.username;
    this._content = message.content;
    this._id = message.id;
    this._author = {
      id: message.author.id,
      name: message.author.tag,
    };
    this._channel = {
      id: message.channel.id,
      name: undefined,
      type: message.channel.type,
    };

    this._server = {
      id: undefined,
      name: undefined,
    };

    if (message.guild) {
      this._server.id = message.guild.id;
      this._server.name = message.guild.name;
    }

    if (message.channel.type !== 'dm') {
      const channel = message.channel as Discord.TextChannel;
      this._channel.name = channel.name;
    }

    this._origin = 'Discord';
  }

  get id(): string {
    return this._id;
  }

  get server(): { id: string | undefined, name: string | undefined } {
    return this._server;
  }

  get channel(): { id: string, name: string | undefined, type: 'dm' | 'text' | 'voice' | 'group' | 'category' } {
    return this._channel;
  }

  get guild(): Discord.Guild | undefined {
    if (this._message.channel.type === 'text') {
      const channel = this._message.channel as Discord.TextChannel;
      return channel.guild;
    }

    return undefined;
  }

  get author(): { id: string, name: string } {
    return this._author;
  }

  get sender(): string {
    return this._sender;
  }

  get content(): string {
    return this._content;
  }

  get origin(): string {
    return this._origin;
  }

  get isPrivate(): boolean {
    return this._channel.type === 'dm';
  }

  public async reply(message: string, options: Discord.MessageOptions = {}): Promise<Message> {
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    const sent: any = await this._message.channel.send(message, options);
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
        logger.error(`Unable to send error message to channel '${this.channel.name} (${this.channel.id})'`);
        if (error.stack) {
          logger.error(error.stack.toString());
        } else {
          logger.error(error.toString());
        }
      });
  }

  public async edit(message: string, options: Discord.MessageOptions = {}): Promise<void> {
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    await this._message.edit(message, options);
  }

  public async remove(timeout?: number): Promise<boolean> {
    try {
      await this._message.delete(timeout);
      return true;
    } catch {
      return false;
    }
  }
}
