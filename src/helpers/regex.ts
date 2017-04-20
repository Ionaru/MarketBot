import { commandPrefix } from '../market-bot';

export function createCommandRegex(commands: Array<string>, rootCommand = false): RegExp {
  let rootOnly = '';
  if (rootCommand) {
    rootOnly = '^';
  }

  return new RegExp(`${rootOnly}(${commands.map((element) => {
    return commandPrefix + element + '\\b';
  }).join('|')})`, 'i');
}
