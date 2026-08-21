import { EventEmitter } from 'events';

import Discord, {
    ActivityType,
    ChannelType,
    Events,
    GatewayDispatchEvents,
    GatewayIntentBits,
    Partials,
    WebSocketManager,
} from 'discord.js';
import { InteractionHandler } from 'slash-create';

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
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessageReactions,
        ], partials: [Partials.Channel]});
        this.emitter = new EventEmitter();

        this.client.on(Events.ClientReady, () => {
            this.onReady();
        });

        this.client.on(Events.MessageCreate, (message: Discord.Message) => {
            this.onMessage(message);
        });

        this.client.on(Events.Warn, (warning: string) => {
            Client.onWarning(warning);
        });

        this.client.on(Events.Error, (error: Error) => {
            Client.onError(error);
        });

        // discord.js reconnects shards by itself, so this only reports. The old
        // handler listened for a "disconnect" event that has not existed since v12
        // and forced a destroy/login cycle, which would fight that recovery.
        this.client.on(Events.ShardDisconnect, (event, shardId) => {
            Client.onShardDisconnect(event, shardId);
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

    public get commandHandler(): (handler: InteractionHandler) => WebSocketManager {
        // slash-create is fed the raw gateway payload. WebSocketManager emits every
        // dispatch under its own type name with the payload's "d" field as the first
        // argument, which is exactly the shape slash-create's GatewayServer expects.
        return (handler: InteractionHandler) => this.client.ws.on(GatewayDispatchEvents.InteractionCreate, handler);
    }

    private static onError(error: Error) {
        process.stderr.write(`Discord: \n${error.message}\n`);
    }

    private static onWarning(warning: string) {
        process.emitWarning(`Discord: \n${warning}`);
    }

    private static onShardDisconnect(event: {code: number; reason?: string;}, shardId: number) {
        process.emitWarning(`Discord shard ${shardId} disconnected, code ${event.code}: ${event.reason ?? 'no reason given'}`);
    }

    public login() {
        this.client.login(this.credentials).then();
    }

    public disconnect(): Promise<void> {
        return this.client.destroy();
    }

    public async sendToChannel(id: string, message: string, userId?: string): Promise<void> {
        if (message.length > maxMessageLength) {
            throw new Error('MaxMessageLengthReached');
        }
        try {
            const channel = [...this.client.channels.cache.values()].find((clientChannel) => clientChannel.id === id);
            if (channel) {
                if (channel.type === ChannelType.DM || channel.type === ChannelType.GuildText) {
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
                name: `with ISK (try /info)`,
                type: ActivityType.Playing,
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

    private onReady() {
        // eslint-disable-next-line no-underscore-dangle
        this._name = this.client.user?.username;
        // eslint-disable-next-line no-underscore-dangle
        this._id = this.client.user?.id;
        this.setDiscordPresence();
        this.emitter.emit('ready');
    }
}
