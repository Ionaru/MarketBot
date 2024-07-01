import Discord, { Intents, WebSocketManager } from "discord.js";
import type { InteractionHandler } from "slash-create";

import { Message } from "./message";
import { maxMessageLength } from "./misc";

export class Client {
    public readonly emitter: EventTarget;

    private client: Discord.Client;
    private credentials: string;
    private _name?: string;
    private _id?: string;
    private presenceInterval?: Timer;

    public constructor(credentials: string) {
        this.credentials = credentials;
        this.client = new Discord.Client({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.DIRECT_MESSAGES,
                Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
                Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
            ],
            partials: ["CHANNEL"],
        });
        this.emitter = new EventTarget();

        this.client.on("ready", () => {
            this.onReady();
        });

        this.client.on("warn", (warning: string) => {
            Client.onWarning(warning);
        });

        this.client.on("error", (error: Error) => {
            Client.onError(error);
        });

        this.client.on("disconnect", (event: any) => {
            this.onDisconnect(event);
        });
    }

    public get name(): string | undefined {
        return this._name;
    }

    public get id(): string | undefined {
        return this._id;
    }

    public get serverCount(): number {
        return [...this.client.guilds.cache.values()].length;
    }

    public get upTime(): Date | undefined {
        return this.client.readyAt || undefined;
    }

    public get commandHandler(): (
        handler: InteractionHandler,
    ) => WebSocketManager {
        return (handler: InteractionHandler) =>
            this.client.ws.on("INTERACTION_CREATE" as any, handler);
    }

    private static onError(error: Error) {
        process.stderr.write(`Discord: \n${error.message}\n`);
    }

    private static onWarning(warning: string) {
        process.emitWarning(`Discord: \n${warning}`);
    }

    public login() {
        void this.client.login(this.credentials);
    }

    public disconnect() {
        this.client.destroy();
    }

    public reconnect() {
        this.disconnect();
        this.login();
    }

    public async sendToChannel(
        id: string,
        message: string,
        userId?: string,
    ): Promise<void> {
        if (message.length > maxMessageLength) {
            throw new Error("MaxMessageLengthReached");
        }
        try {
            const channel = [...this.client.channels.cache.values()].find(
                (clientChannel) => clientChannel.id === id,
            );
            if (channel) {
                if (channel.type === "DM" || channel.type === "GUILD_TEXT") {
                    const textChannel = channel as
                        | Discord.TextChannel
                        | Discord.DMChannel;
                    await textChannel.send(message).catch((error) => {
                        throw new Error(error);
                    });
                }
            } else {
                // Try to create a DM channel with the user, this might not always succeed depending on their privacy settings.
                const user = [...this.client.users.cache.values()].find(
                    (discordUser) => discordUser.id === userId,
                );
                if (user) {
                    const dmChannel: Discord.DMChannel = await user.createDM();
                    await dmChannel.send(message).catch((error) => {
                        throw new Error(error);
                    });
                }
            }
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            process.stderr.write(`Cannot send message: \n${error}\n`);
        }
    }

    public getNickname(message: Message): string | undefined {
        const guild = message.guild;
        if (guild && this.client.user) {
            return (
                guild.members.cache.get(this.client.user.id)?.nickname ||
                undefined
            );
        }

        return undefined;
    }

    private setDiscordPresence() {
        this.client.user?.setPresence({
            activities: [
                {
                    name: `with ISK (try /info)`,
                    type: "PLAYING",
                },
            ],
            status: "online",
        });

        // Re-set the presence every hour because of a known issue on Discord's side.
        // https://github.com/discordapp/discord-api-docs/issues/834
        if (!this.presenceInterval) {
            this.presenceInterval = setInterval(
                () => this.setDiscordPresence(),
                3_600_000,
            ); // Every hour.
        }
    }

    private onDisconnect(event: any) {
        process.emitWarning("Connection closed unexpectedly");
        process.emitWarning("Code:", event.code);
        process.emitWarning("Reason:", event.reason);
        process.emitWarning("Attempting reconnect...");
        this.reconnect();
    }

    private onReady() {
        this._name = this.client.user?.username;

        this._id = this.client.user?.id;
        this.setDiscordPresence();
        this.emitter.dispatchEvent(new Event("ready"));
    }
}
