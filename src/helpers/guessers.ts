import { sortArrayByObjectProperty } from '@ionaru/array-utils';
import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import escapeStringRegexp from 'escape-string-regexp';
import Fuse from 'fuse.js';

import { fetchUniverseType } from './api';
import { items, itemsFuse, regions, regionsFuse, systems } from './cache';
import { itemFormat, newLine, regionFormat } from './message-formatter';

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

const replaceQuotes = (text: string): string => text.replace(/'/g, '').replace(/"/g, '');

export const guessSystemInput = async (input: string) => guessUserInput(input, systems);

export const guessRegionInput = async (input: string) => guessUserInput(input, regions, regionsFuse);

export const guessItemInput = async (input: string) => guessUserInput(input, items, itemsFuse);

export const matchWithRegex = (possibility: IUniverseNamesDataUnit, regex: RegExp) =>
    possibility.name ? possibility.name.match(regex) || undefined : undefined;

// eslint-disable-next-line sonarjs/cognitive-complexity,max-len
export const guessUserInput = async (itemString: string, possibilitiesList: IUniverseNamesData, fuse?: Fuse<IUniverseNamesDataUnit>, raw = true): Promise<IGuessReturn> => {

    itemString = escapeStringRegexp(itemString);

    let regex: RegExp;
    let guess = false;
    let itemData: IUniverseNamesDataUnit = {
        category: '' as any,
        id: 0,
        name: '',
    };
    let possibilities: IUniverseNamesData = [];

    const itemWords = itemString.split(' ');

    // Check if the item is an ID
    const possibleId = Number(itemWords[0]);
    if (!isNaN(possibleId)) {
        possibilities.push(...possibilitiesList.filter((possibility): boolean => possibility.id === possibleId));
        possibilities = await filterUnpublishedTypes(possibilities);
        sortArrayByObjectProperty(possibilities, (possibility) => possibility.name.length);
        if (possibilities.length) {
            return {guess: false, id: true, itemData: possibilities[0]};
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
        const fuseGuess = fuse.search(itemString)[0].item as IUniverseNamesDataUnit | undefined;

        if (fuseGuess) {
            possibilities.push(fuseGuess);
        }

        guess = true;
    }

    if (possibilities.length) {
        // Sort by word length, shortest is usually the correct one.
        let sortedPossibilities = sortArrayByObjectProperty(possibilities, (possibility) => possibility.name.length);
        sortedPossibilities = await filterUnpublishedTypes(sortedPossibilities);
        if (sortedPossibilities.length) {
            itemData = sortedPossibilities[0];
        }
    }

    if (!itemData.id && raw) {
        // Strip quotes from possibilities and try guessing again.
        const list = possibilitiesList.map((possibility) => ({
            category: possibility.category,
            id: possibility.id,
            name: replaceQuotes(possibility.name),
            originalName: possibility.name,
        }));
        itemData = (await guessUserInput(itemString, list, fuse, false)).itemData;
    }

    return {guess, id: false, itemData};
};

const filterUnpublishedTypes = async (possibilities: IUniverseNamesData): Promise<IUniverseNamesData> => {

    const filteredPossibilities: IUniverseNamesData = [];

    await Promise.all(possibilities.map(async (possibility) => {
        if (possibility.category === 'inventory_type') {
            const type = await fetchUniverseType(possibility.id);
            if (!type || !type.published) {
                return;
            }
        }
        filteredPossibilities.push(possibility);
    }));

    return filteredPossibilities;
};

export const getGuessHint = (guessReturn: IGuessReturn, userInput: string): string => {
    let returnString = '';

    if (!guessReturn.itemData.id) {
        returnString += `I don't know what you mean with "${ userInput }" 😟`;
    } else if (guessReturn.guess) {
        returnString += `"${ userInput }" didn't directly match any item I know of,`;
        returnString += ` did you mean ${ itemFormat(guessReturn.itemData.name) }?.`;
        returnString += newLine(2);
    } else if (guessReturn.id) {
        returnString += `"${ itemFormat(userInput) }" looks like an item ID, `;
        returnString += `it's the ID for ${ itemFormat(guessReturn.itemData.name) }.`;
        returnString += newLine(2);
    }

    return returnString;
};

export const getSelectedRegion = async (input: string, regionReply: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const defaultRegion = regions.find((region) => region.name === 'The Forge')!;
    let selectedRegion = defaultRegion;

    if (input) {
        selectedRegion = (await guessRegionInput(input)).itemData;
        if (!selectedRegion.id) {
            selectedRegion = defaultRegion;
            regionReply += `I don't know of the "${ input }" region, defaulting to ${ regionFormat(selectedRegion.name) }`;
            regionReply += newLine(2);
        }
    }

    return {regionReply, selectedRegion};
};
