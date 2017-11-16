import * as Discord from 'discord.js';
import { logger } from 'winston-pnp-logger';

import { makeCode, makeURL, makeUserLink, newLine } from '../../helpers/message-formatter';
import { creator } from '../../market-bot';
import { maxMessageLength } from './misc';

export class Message {

  private _message: Discord.Message;
  private _origin: string;
  private _sender: string;
  private _author: { id: string, name: string };
  private _channel: { id: string, name: string | undefined, type: 'dm' | 'text' | 'voice' | 'group' };
  private _server: { id: string | undefined, name: string | undefined };
  private _content: string;
  private _id: string;

  constructor(message: Discord.Message) {
    this._message = message;
    this._sender = message.author.username;
    this._content = message.content;
    this._id = message.id;
    this._author = {
      id: message.author.id,
      name: message.author.tag
    };
    this._channel = {
      id: message.channel.id,
      name: undefined,
      type: message.channel.type
    };

    this._server = {
      id: undefined,
      name: undefined
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

  get channel(): { id: string, name: string | undefined, type: 'dm' | 'text' | 'voice' | 'group' } {
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

  public async reply(message: string, options = {}): Promise<Message> {
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    const sent: any = await this._message.channel.send(message, options);
    return new Message(sent[0] || sent);
  }

  public async sendError(caughtError: Error) {
    const time = Date.now();
    logger.error(`Caught error @ ${time}` + newLine(), caughtError);
    logger.error(`Original message:`, this.content);
    this.reply(
      `I'm sorry, it appears I have developed a fault, please let ` +
      `${makeUserLink(creator.id)} (${makeURL('https://discord.gg/k9tAX94')}) know about this error.` +
      newLine(2) +
      `Technical information: ${makeCode(`${caughtError.message} @ ${time}`)}`
    ).then().catch(async (error: Discord.DiscordAPIError) => {
      logger.error(`Unable to send error message to channel '${this.channel.name} (${this.channel.id})'`);
      if (error.stack) {
        logger.error(error.stack.toString());
      } else {
        logger.error(error.toString());
      }
    });
  }

  public async edit(message: string): Promise<void> {
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    await this._message.edit(message);
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
