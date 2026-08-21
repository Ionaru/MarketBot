import { SlashCommand, SlashCreator } from 'slash-create';

import { debug } from '../debug';

export class SlashCreatorService {

    private static readonly debug = debug.extend('SlashCreatorService');

    public constructor(
        private readonly creator: SlashCreator,
    ) { }

    public registerCommand(registerer: (creator: SlashCreator) => SlashCommand): void {
        this.creator.registerCommand(registerer(this.creator));
    }

    public async syncCommands(): Promise<void> {
        // slash-create 5's syncCommands() was fire-and-forget and signalled completion
        // by emitting "synced". Version 7 made it async and stopped emitting that event,
        // although the event is still declared on the creator. Waiting for it therefore
        // never resolves, and since this is awaited before client.login(), the bot would
        // silently never connect to Discord and log nothing at all. Await the promise.
        await this.creator.syncCommands();
        SlashCreatorService.debug('Commands synced');
    }
}
