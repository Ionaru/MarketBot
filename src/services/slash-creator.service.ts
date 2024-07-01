import { SlashCommand, SlashCreator } from "slash-create";

import { debug } from "../debug";

export class SlashCreatorService {
    static readonly #debug = debug.extend("SlashCreatorService");

    constructor(private readonly creator: SlashCreator) {}

    registerCommand(registerer: (creator: SlashCreator) => SlashCommand): void {
        this.creator.registerCommand(registerer(this.creator));
    }

    syncCommands(): Promise<unknown> {
        return new Promise<void>((resolve) => {
            this.creator.once("synced", () => {
                SlashCreatorService.#debug("Commands synced");
                resolve();
            });
            this.creator.syncCommands();
        });
    }
}
