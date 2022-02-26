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

    public syncCommands(): Promise<unknown> {
        return new Promise((resolve) => {
            this.creator.once('synced', () => {
                SlashCreatorService.debug('Commands synced');
                resolve(undefined);
            });
            this.creator.syncCommands();
        });
    }
}
