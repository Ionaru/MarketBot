import * as Discord from 'discord.js';
import { EventEmitter } from 'events';
import { logger } from '../helpers/program-logger';
import { creator } from '../market-bot';
import { makeBold, makeCode, makeURL, makeUserLink, newLine } from '../helpers/message-formatter';

export const makeBoldStartTag = '**';
export const makeBoldEndTag = '**';

export const makeItalicsStartTag = '*';
export const makeItalicsEndTag = '*';

export const makeCodeStartTag = '`';
export const makeCodeEndTag = '`';

export const makeUrlStartTag = '<';
export const makeUrlEndTag = '>';

export const makeUserLinkStartTag = '<@';
export const makeUserLinkEndTag = '>';

export const newLineTag = '\n';

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
      const channel = <Discord.TextChannel> message.channel;
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

  async reply(message: string): Promise<Message> {
    const sent = await this._message.channel.send(message);
    return new Message(sent[0] || sent);
  }

  async sendError(caughtError: Error) {
    const time = Date.now();
    logger.error(`Caught error @ ${time}` + newLine(), caughtError);
    logger.error(`Original message:`, this.content);
    this.reply(
      `${makeBold('ERROR')} Something went wrong, please consult ${makeUserLink(creator.id)} (${makeURL('https://discord.gg/k9tAX94')})` +
      newLine(2) +
      `Error message: ${makeCode(`${caughtError.message} @ ${time}`)}`
    ).then().catch((error: Response) => {
      logger.error(`Unable to send error message to channel '${this.channel.name} (${this.channel.id})'!`);
      logger.error(error);
    });
  }

  async edit(message: string): Promise<void> {
    await this._message.edit(message);
  }
}

export class Client {

  private client: Discord.Client;
  private credentials: string;
  private _emitter: EventEmitter;
  private _name: string;

  constructor(credentials: string) {
    this.credentials = credentials;
    this.client = new Discord.Client();
    this._emitter = new EventEmitter();

    this.client.on('ready', () => {
      this._name = this.client.user.username;
      this.client.user.setPresence({game: {name: 'with ISK (/i for info)'}}).then();
      this.onReady();
    });

    this.client.on('message', (message: Discord.Message) => {
      this.onMessage(message);
    });

    this.client.on('warning', (warning: string) => {
      Client.onWarning(warning);
    });

    this.client.on('error', (error: Error) => {
      Client.onError(error);
    });

    this.client.on('disconnect', (event: CloseEvent) => {
      this.onDisconnect(event).then();
    });
  }

  private static onError(error: any) {
    logger.error(error.toString());
  }

  private static onWarning(warning: string) {
    logger.warn(warning);
  }

  public login() {
    this.client.login(this.credentials);
  }

  public async disconnect() {
    await this.client.destroy();
  }

  public async reconnect() {
    await this.disconnect();
    this.login();
  }

  public async sendToChannel(id: string, message: string) {
    const channel: Discord.Channel = this.client.channels.array().filter(_ => _.id === id)[0];
    if (channel.type === 'dm' || channel.type === 'text') {
      const textChannel = <Discord.TextChannel> channel;
      await textChannel.send(message);
    }
  }

  get emitter(): EventEmitter {
    return this._emitter;
  }

  get name(): string {
    return this._name;
  }

  get serverCount(): number {
    return this.client.guilds.array().length;
  }

  get privateChannelCount(): number {
    return this.client.channels.array().filter(_ => _.type === 'dm').length;
  }

  get upTime(): Date {
    return this.client.readyAt;
  }

  private onMessage(message: Discord.Message): void {
    this._emitter.emit('message', new Message(message));
  }

  private async onDisconnect(event: CloseEvent) {
    logger.warn('Connection closed');
    logger.warn('Code:', event.code);
    logger.warn('Reason:', event.reason);
    logger.warn('Attempting reconnect...');
    await this.reconnect();
  }

  private onReady() {
    this.emitter.emit('ready');
  }
}
