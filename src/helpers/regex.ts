import escapeStringRegexp = require('escape-string-regexp');

import { Command } from '../chat-service/command';

export function createCommandRegex(commands: string[], rootCommand = false): RegExp {
    let beginning = '';
    let end = '';
    if (rootCommand) {
        beginning = '^';
        end = '$';
    }

    return new RegExp(`${beginning}(${commands.map((element) => {
        return escapeStringRegexp(Command.commandPrefix) + element + '\\b';
    }).join('|')})${end}`, 'i');
}
