import escapeStringRegexp = require('escape-string-regexp');

import { Command } from '../chat-service/command';

export function createCommandRegex(commands: string[], rootCommand = false): RegExp {
    const beginning = rootCommand ? '^' : '';
    const end = rootCommand ? '$' : '';

    return new RegExp(`${beginning}(${commands.map((element) => {
        return escapeStringRegexp(Command.commandPrefix) + element + '\\b';
    }).join('|')})${end}`, 'i');
}
