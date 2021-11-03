import escapeStringRegexp from 'escape-string-regexp';

import { Command } from '../chat-service/command';

export const createCommandRegex = (commands: string[], rootCommand = false): RegExp => {
    const beginning = rootCommand ? '^' : '';
    const end = rootCommand ? '$' : '';

    const commandsRegex = commands.map((element) => `${escapeStringRegexp(Command.commandPrefix)}${element}\\b`);
    return new RegExp(`${beginning}(${commandsRegex.join('|')})${end}`, 'i');
};
