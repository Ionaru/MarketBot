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
  private _id: string;

  constructor(credentials: string) {
    this.credentials = credentials;
    this.client = new Discord.Client();
    this._emitter = new EventEmitter();

    this.client.on('ready', () => {
      this._name = this.client.user.username;
      this._id = this.client.user.id;
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

  public async sendToChannel(id: string, message: string, userId?: string): Promise<void> {
    if (message.length > maxMessageLength) {
      throw new Error('MaxMessageLengthReached');
    }
    try {
      const channel: Discord.Channel = this.client.channels.array().filter((_) => _.id === id)[0];
      if (channel) {
        if (channel.type === 'dm' || channel.type === 'text') {
          const textChannel = channel as Discord.TextChannel | Discord.DMChannel;
          await textChannel.send(message).catch((error) => {throw new Error(error); });
        }
      } else {
        // Try to create a DM channel with the user, this might not always succeed depending on their privacy settings.
        const user: Discord.User = this.client.users.array().filter((_) => _.id === userId)[0];
        if (user) {
          const dmChannel: Discord.DMChannel = await user.createDM();
          await dmChannel.send(message).catch((error) => {throw new Error(error); });
        }
      }
    } catch (error) {
      logger.error('Cannot send message:', error);
    }
  }

  public getNickname(message: Message): string | undefined {
    const guild = message.guild;
    if (guild) {
      return guild.member(this.client.user).nickname;
    }

    return undefined;
  }

  get emitter(): EventEmitter {
    return this._emitter;
  }

  get name(): string {
    return this._name;
  }

  get id(): string {
    return this._id;
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
    logger.warn('Connection closed unexpectedly');
    logger.warn('Code:', event.code);
    logger.warn('Reason:', event.reason);
    logger.warn('Attempting reconnect...');
    await this.reconnect();
  }

  private onReady() {
    this.emitter.emit('ready');
  }
}
