import * as escapeStringRegexp from 'escape-string-regexp';
import * as Fuse from 'fuse.js';

import { INamesData } from '../typings';
import { fetchUniverseType } from './api';
import { sortArrayByObjectPropertyLength } from './arrays';
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
  itemData: INamesData;
  guess: boolean;
  id: boolean;
}

export async function guessUserInput(itemString: string, possibilitiesList: INamesData[], fuse?: Fuse<INamesData>): Promise<IGuessReturn> {

  itemString = escapeStringRegexp(itemString);

  let regex: RegExp;
  let guess = false;
  let itemData: INamesData = {
    category: '',
    id: 0,
    name: '',
  };
  const possibilities: INamesData[] = [];

  const itemWords = itemString.split(' ');

  // Check if the item is an ID
  const possibleId = Number(itemWords[0]);
  if (!isNaN(possibleId)) {
    possibilities.push(...possibilitiesList.filter((possibility): boolean | void => possibility.id === possibleId));
    if (possibilities.length) {
      return {itemData: possibilities[0], guess: false, id: true};
    }
  }

  // Check if word is defined as a shortcut.
  regex = new RegExp(`^${itemWords[0]}`, 'i');
  const shortcut = Object.keys(shortcuts).filter((shortcutText) => {
    return shortcutText.match(regex);
  })[0];

  if (shortcut) {
    itemWords[0] = shortcuts[shortcut];
    itemString = itemWords.join(' ');
  }

  // Check in start of the words.
  regex = new RegExp(`^${itemString}`, 'i');
  possibilities.push(...possibilitiesList.filter((possibility): RegExpMatchArray | null | void => {
    if (possibility.name) {
      return possibility.name.match(regex);
    }
  }));

  if (!possibilities.length) {
    // Check at end of the words.
    regex = new RegExp(`${itemString}$`, 'i');
    possibilities.push(...possibilitiesList.filter((possibility): RegExpMatchArray | null | void => {
      if (possibility.name) {
        return possibility.name.match(regex);
      }
    }));
  }

  if (!possibilities.length) {
    // Check in middle of words.
    possibilities.push(...possibilitiesList.filter((possibility): boolean | void => {
      if (possibility.name) {
        return possibility.name.toUpperCase().indexOf(itemString.toUpperCase()) !== -1;
      }
    }));
  }

  if (!possibilities.length && fuse) {
    // Use Fuse to search (slow but fuzzy).
    possibilities.push(fuse.search(itemString)[0] as INamesData);
    guess = true;
  }

  if (possibilities.length) {
    // Sort by word length, shortest is usually the correct one.
    const sortedPossibilities = sortArrayByObjectPropertyLength(possibilities, 'name');

    for (const possibility of sortedPossibilities) {
      // Check if the matched item is published.
      const type = await fetchUniverseType(possibility.id);
      if (type && type.published) {
        itemData = possibility;
        break;
      }
    }
  }

  return {itemData, guess, id: false};
}

export function getGuessHint(guessReturn: IGuessReturn, userInput: string): string {
  let returnString = '';

  if (!guessReturn.itemData) {
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
