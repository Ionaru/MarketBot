import * as escapeStringRegexp from 'escape-string-regexp';

import { commandPrefix } from '../market-bot';

export function createCommandRegex(commands: string[], rootCommand = false): RegExp {
  let rootOnly = '';
  if (rootCommand) {
    rootOnly = '^';
  }

  return new RegExp(`${rootOnly}(${commands.map((element) => {
    return escapeStringRegexp(commandPrefix) + element + '\\b';
  }).join('|')})`, 'i');
}
