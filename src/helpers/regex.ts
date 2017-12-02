import escapeStringRegexp = require('escape-string-regexp');

import { commandPrefix } from '../market-bot';

export function createCommandRegex(commands: string[], rootCommand = false): RegExp {
  let beginning = '';
  let end = '';
  if (rootCommand) {
    beginning = '^';
    end = '$';
  }

  return new RegExp(`${beginning}(${commands.map((element) => {
    return escapeStringRegexp(commandPrefix) + element + '\\b';
  }).join('|')})${end}`, 'i');
}
