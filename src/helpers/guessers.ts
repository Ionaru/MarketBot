import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import * as escapeStringRegexp from 'escape-string-regexp';
import * as Fuse from 'fuse.js';

import { fetchUniverseType } from './api';
import { sortArrayByObjectPropertyLength } from './arrays';
import { items, itemsFuse, regions, regionsFuse, systems } from './cache';
import { itemFormat, newLine } from './message-formatter';

interface IShortcuts {
    [shortcut: string]: string;
}

export const shortcuts: IShortcuts = {
    bcs: 'Ballistic Control System',
    dc: 'Damage Control',
    dda: 'Drone Damage Amplifier',
    dni: 'Dominix Navy Issue',
    fnc: 'Federation Navy Comet',
    hfi: 'Hurricane Fleet Issue',
    lsi: 'Large Skill Injector',
    mlu: 'Mining Laser Upgrade',
    mni: 'Megathron Navy Issue',
    mtu: 'Mobile Tractor Unit',
    rni: 'Raven Navy Issue',
    ssi: 'Small Skill Injector',
    vni: 'Vexor Navy Issue',
};

export interface IGuessReturn {
    itemData: IUniverseNamesDataUnit;
    guess: boolean;
    id: boolean;
}

function replaceQuotes(text: string): string {
    return text.replace(/'/g, '').replace(/"/g, '');
}

export async function guessSystemInput(input: string) {
    return guessUserInput(input, systems);
}

export async function guessRegionInput(input: string) {
    return guessUserInput(input, regions, regionsFuse);
}

export async function guessItemInput(input: string) {
    return guessUserInput(input, items, itemsFuse);
}

export function matchWithRegex(possibility: IUniverseNamesDataUnit, regex: RegExp) {
    return possibility.name ? possibility.name.match(regex) || undefined : undefined;
}

// tslint:disable-next-line:cognitive-complexity max-line-length
export async function guessUserInput(itemString: string, possibilitiesList: IUniverseNamesData, fuse?: Fuse<IUniverseNamesDataUnit>, raw = true):
    Promise<IGuessReturn> {

    itemString = escapeStringRegexp(itemString);

    let regex: RegExp;
    let guess = false;
    let itemData: IUniverseNamesDataUnit = {
        category: '',
        id: 0,
        name: '',
    };
    let possibilities: IUniverseNamesData = [];

    const itemWords = itemString.split(' ');

    // Check if the item is an ID
    const possibleId = Number(itemWords[0]);
    if (!isNaN(possibleId)) {
        possibilities.push(...possibilitiesList.filter((possibility): boolean | void => possibility.id === possibleId));
        possibilities = await filterUnpublishedTypes(possibilities);
        sortArrayByObjectPropertyLength(possibilities, 'name');
        if (possibilities.length) {
            return {itemData: possibilities[0], guess: false, id: true};
        }
    }

    // Check if word is defined as a shortcut.
    regex = new RegExp(`^${itemWords[0]}`, 'i');
    const shortcut = Object.keys(shortcuts).find((shortcutText) => shortcutText.match(regex));

    if (shortcut) {
        itemWords[0] = shortcuts[shortcut];
        itemString = itemWords.join(' ');
    }

    // Check for full words.
    possibilities.push(...possibilitiesList.filter((possibility): boolean | void => {
        if (possibility.name) {
            const possibilityName = replaceQuotes(possibility.name).toLowerCase();
            const possibilityParts = possibilityName.split(' ');
            return itemWords.every((part) => possibilityParts.includes(part));
        }
    }));

    if (!possibilities.length) {
        // Check in start of the words.
        regex = new RegExp(`^${itemString}`, 'i');
        possibilities.push(...possibilitiesList.filter((possibility): RegExpMatchArray | undefined => matchWithRegex(possibility, regex)));
    }

    if (!possibilities.length) {
        // Check at end of the words.
        regex = new RegExp(`${itemString}$`, 'i');
        possibilities.push(...possibilitiesList.filter((possibility): RegExpMatchArray | undefined => matchWithRegex(possibility, regex)));
    }

    if (!possibilities.length) {
        // Check in middle of words.
        possibilities.push(...possibilitiesList.filter((possibility): boolean | void => {
            if (possibility.name) {
                return possibility.name.toUpperCase().includes(itemString.toUpperCase());
            }
        }));
    }

    possibilities = await filterUnpublishedTypes(possibilities);

    if (!possibilities.length && fuse) {
        // Use Fuse to search (slow but fuzzy).
        const fuseGuess = fuse.search(itemString)[0] as IUniverseNamesDataUnit | undefined;

        if (fuseGuess) {
            possibilities.push(fuseGuess);
        }

        guess = true;
    }

    if (possibilities.length) {
        // Sort by word length, shortest is usually the correct one.
        let sortedPossibilities = sortArrayByObjectPropertyLength(possibilities, 'name');
        sortedPossibilities = await filterUnpublishedTypes(sortedPossibilities);
        if (sortedPossibilities.length) {
            itemData = sortedPossibilities[0];
        }
    }

    if (!itemData.id && raw) {
        // Strip quotes from possibilities and try guessing again.
        const list = possibilitiesList.map((possibility) => {
            return {
                category: possibility.category,
                id: possibility.id,
                name: replaceQuotes(possibility.name),
                originalName: possibility.name,
            };
        });
        itemData = (await guessUserInput(itemString, list, fuse, false)).itemData;
    }

    return {itemData, guess, id: false};
}

async function filterUnpublishedTypes(possibilities: IUniverseNamesData): Promise<IUniverseNamesData> {

    for (const possibility of possibilities) {

        if (possibility.category === 'inventory_type') {
            const type = await fetchUniverseType(possibility.id);
            if (!type || !type.published) {
                continue;
            }
        }
        return [possibility];
    }

    return [];
}

export function getGuessHint(guessReturn: IGuessReturn, userInput: string): string {
    let returnString = '';

    if (!guessReturn.itemData.id) {
        returnString += `I don't know what you mean with "${userInput}" 😟`;
    } else if (guessReturn.guess) {
        returnString += `"${userInput}" didn't directly match any item I know of,`;
        returnString += ` did you mean ${itemFormat(guessReturn.itemData.name)}?.`;
        returnString += newLine(2);
    } else if (guessReturn.id) {
        returnString += `"${itemFormat(userInput)}" looks like an item ID, `;
        returnString += `it's the ID for ${itemFormat(guessReturn.itemData.name)}.`;
        returnString += newLine(2);
    }

    return returnString;
}
