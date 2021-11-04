import { EventEmitter } from 'events';

import Discord, { Intents } from 'discord.js';

import { Command } from '../command';
import { InfoCommand } from '../info-command';

import { Message } from './message';
import { maxMessageLength } from './misc';

import Timeout = NodeJS.Timeout;

export class Client {

    public readonly emitter: EventEmitter;

    private client: Discord.Client;
    private credentials: string;
    private _name?: string;
    private _id?: string;
    private presenceInterval?: Timeout;

    public constructor(credentials: string) {
        this.credentials = credentials;
        this.client = new Discord.Client({intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        ], partials: ['CHANNEL']});
        this.emitter = new EventEmitter();

        this.client.on('ready', () => {
            this.onReady();
        });

        this.client.on('messageCreate', (message: Discord.Message) => {
            this.onMessage(message);
        });

        this.client.on('warn', (warning: string) => {
            Client.onWarning(warning);
        });

        this.client.on('error', (error: Error) => {
            Client.onError(error);
        });

        this.client.on('disconnect', (event: any) => {
            this.onDisconnect(event);
        });
    }

    public get name(): string | undefined {
        // eslint-disable-next-line no-underscore-dangle
        return this._name;
    }

    public get id(): string | undefined {
        // eslint-disable-next-line no-underscore-dangle
        return this._id;
    }

    public get serverCount(): number {
        return [...this.client.guilds.cache.values()].length;
    }

    public get upTime(): Date | undefined {
        return this.client.readyAt || undefined;
    }

    private static onError(error: Error) {
        process.stderr.write(`Discord: \n${error.message}\n`);
    }

    private static onWarning(warning: string) {
        process.emitWarning(`Discord: \n${warning}`);
    }

    public login() {
        this.client.login(this.credentials).then();
    }

    public disconnect() {
        this.client.destroy();
    }

    public reconnect() {
        this.disconnect();
        this.login();
    }

    public async sendToChannel(id: string, message: string, userId?: string): Promise<void> {
        if (message.length > maxMessageLength) {
            throw new Error('MaxMessageLengthReached');
        }
        try {
            const channel = [...this.client.channels.cache.values()].find((clientChannel) => clientChannel.id === id);
            if (channel) {
                if (channel.type === 'DM' || channel.type === 'GUILD_TEXT') {
                    const textChannel = channel as Discord.TextChannel | Discord.DMChannel;
                    await textChannel.send(message).catch((error) => {
                        throw new Error(error);
                    });
                }
            } else {
                // Try to create a DM channel with the user, this might not always succeed depending on their privacy settings.
                const user = [...this.client.users.cache.values()].find((discordUser) => discordUser.id === userId);
                if (user) {
                    const dmChannel: Discord.DMChannel = await user.createDM();
                    await dmChannel.send(message).catch((error) => {
                        throw new Error(error);
                    });
                }
            }
        } catch (error) {
            process.stderr.write(`Cannot send message: \n${error}\n`);
        }
    }

    public getNickname(message: Message): string | undefined {
        const guild = message.guild;
        if (guild && this.client.user) {
            return guild.members.cache.get(this.client.user.id)?.nickname || undefined;
        }

        return undefined;
    }

    private setDiscordPresence() {
        this.client.user?.setPresence({
            activities: [{
                name: `with ISK (try ${Command.commandPrefix}${InfoCommand.commands[0]})`,
                type: 'PLAYING',
            }],
            status: 'online',
        });

        // Re-set the presence every hour because of a known issue on Discord's side.
        // https://github.com/discordapp/discord-api-docs/issues/834
        if (!this.presenceInterval) {
            this.presenceInterval = setInterval(() => this.setDiscordPresence(), 3_600_000); // Every hour.
        }
    }

    private onMessage(message: Discord.Message): void {
        this.emitter.emit('message', new Message(message));
    }

    private onDisconnect(event: any) {
        process.emitWarning('Connection closed unexpectedly');
        process.emitWarning('Code:', event.code);
        process.emitWarning('Reason:', event.reason);
        process.emitWarning('Attempting reconnect...');
        this.reconnect();
    }

    private onReady() {
        // eslint-disable-next-line no-underscore-dangle
        this._name = this.client.user?.username;
        // eslint-disable-next-line no-underscore-dangle
        this._id = this.client.user?.id;
        this.setDiscordPresence();
        this.emitter.emit('ready');
    }
}
