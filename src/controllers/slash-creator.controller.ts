import { GatewayServer, SlashCreator } from 'slash-create';

import { configuration } from '..';
import { Client } from '../chat-service/discord/client';
import { debug } from '../debug';
import { SlashCreatorService } from '../services/slash-creator.service';

export class SlashCreatorController {

    private static readonly debug = debug.extend('SlashCreatorController');

    private readonly creator: SlashCreator;

    public constructor() {
        SlashCreatorController.debug('Start');

        const applicationID = configuration.getProperty('discord.id')?.toString();
        const publicKey = configuration.getProperty('discord.key')?.toString();
        const token = configuration.getProperty('discord.token')?.toString();

        if (!applicationID || !publicKey || !token) {
            throw new Error('SlashCreator configuration error!');
        }

        SlashCreatorController.debug('Configuration OK');

        this.creator = new SlashCreator({ applicationID, publicKey, token });
        this.creator.on('commandError', (_, e) => {
            throw e;
        });
        this.creator.on('error', (e) => {
            throw e;
        });

        SlashCreatorController.debug('Ready');
    }

    public init(client: Client): SlashCreatorService {
        SlashCreatorController.debug('Init');
        this.creator.withServer(new GatewayServer(client.commandHandler));
        return new SlashCreatorService(this.creator);
    }
}
