import * as Discord from 'discord.js';
import { EventEmitter } from 'events';
import { logger } from 'winston-pnp-logger';

import { commandPrefix, infoCommands } from '../../market-bot';
import { Message } from './message';
import { maxMessageLength } from './misc';

export class Client {

  private static onError(error: any) {
    logger.error(error.toString());
  }

  private static onWarning(warning: string) {
    logger.warn(warning);
  }

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
      this.client.user.setPresence({game: {name: `with ISK (try ${commandPrefix}${infoCommands[0]})`}}).then();
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
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    const channel: Discord.Channel = this.client.channels.array().filter((_) => _.id === id)[0];
    if (channel.type === 'dm' || channel.type === 'text') {
      const textChannel = channel as Discord.TextChannel;
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
    return this.client.channels.array().filter((_) => _.type === 'dm').length;
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
