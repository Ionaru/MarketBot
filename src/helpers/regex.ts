import { commandPrefix } from '../market-bot';
import * as escapeStringRegexp from 'escape-string-regexp';

export function createCommandRegex(commands: Array<string>, rootCommand = false): RegExp {
  let rootOnly = '';
  if (rootCommand) {
    rootOnly = '^';
  }

  return new RegExp(`${rootOnly}(${commands.map((element) => {
    return escapeStringRegexp(commandPrefix) + element + '\\b';
  }).join('|')})`, 'i');
}
