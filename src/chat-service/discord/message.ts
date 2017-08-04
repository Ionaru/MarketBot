import * as Discord from 'discord.js';
import * as PrettyError from 'pretty-error';
import { logger } from 'winston-pnp-logger';

import { makeCode, makeURL, makeUserLink, newLine } from '../../helpers/message-formatter';
import { creator } from '../../market-bot';
import { maxMessageLength } from './misc';

const pe = new PrettyError();

export class Message {

  private _message: Discord.Message;
  private _origin: string;
  private _sender: string;
  private _author: { id: string, name: string };
  private _channel: { id: string, name: string, type: 'dm' | 'text' | 'voice' | 'group' };
  private _server: { id: string, name: string };
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
      name: null,
      type: message.channel.type
    };

    this._server = {
      id: null,
      name: null
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

  get server(): { id: string, name: string } {
    return this._server;
  }

  get channel(): { id: string, name: string, type: 'dm' | 'text' | 'voice' | 'group' } {
    return this._channel;
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

  public async reply(message: string): Promise<Message> {
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    const sent = await this._message.channel.send(message);
    return new Message(sent[0] || sent);
  }

  public async sendError(caughtError: Error) {
    const time = Date.now();
    logger.error(`Caught error @ ${time}` + newLine(), pe.render(caughtError));
    logger.error(`Original message:`, this.content);
    this.reply(
      `I'm sorry, it appears I have developed a fault, please let` +
      `${makeUserLink(creator.id)} (${makeURL('https://discord.gg/k9tAX94')}) know about this error.` +
      newLine(2) +
      `Technical information: ${makeCode(`${caughtError.message} @ ${time}`)}`
    ).then().catch(async (error: Response) => {
      logger.error(`Unable to send error message to channel '${this.channel.name} (${this.channel.id})'!`);
      const errorMessage = await error.text().catch(() => 'Unknown error.');
      logger.error(errorMessage);
    });
  }

  public async edit(message: string): Promise<void> {
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    await this._message.edit(message);
  }
}