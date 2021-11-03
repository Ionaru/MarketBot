import { commandPrefix, limitCommandRegex, regionCommandRegex, systemCommandRegex } from '../market-bot';
import { IParsedMessage } from '../typings.d';

export const parseMessage = (message: string): IParsedMessage => {
    const parsedMessage: IParsedMessage = {
        content: message,
        item: '',
        limit: 0,
        region: '',
        system: '',
    };

    // Remove double spaces because that confuses the input guessing system
    let messageText = message.replace(/ +(?= )/g, '');

    // Split the message into separate words and remove the first word (the command tag)
    const messageWords = messageText.split(' ');
    messageWords.shift();

    if (messageWords) {
        messageText = messageWords.join(' ');
    }

    // Search for the item text
    let itemText = messageText;
    if (itemText.indexOf(commandPrefix) !== -1) {
        itemText = itemText.substring(0, itemText.indexOf(commandPrefix)).trim();
    }
    parsedMessage.item = itemText;

    const matcher = (regex: RegExp, key: keyof IParsedMessage, parser?: (input: string) => string | number) => {
        const match = messageText.match(regex);
        if (match && match.index) {
            let sep1 = messageText.substring(match.index + match[0].length).trim();
            if (sep1.indexOf(commandPrefix) !== -1) {
                sep1 = sep1.substring(0, sep1.indexOf(commandPrefix)).trim();
            }

            (parsedMessage[key] as any) = parser ? parser(sep1) : sep1;
        }
    };

    matcher(regionCommandRegex, 'region');
    matcher(systemCommandRegex, 'system');
    matcher(limitCommandRegex, 'limit', (input) => Number(input));

    return parsedMessage;
};
