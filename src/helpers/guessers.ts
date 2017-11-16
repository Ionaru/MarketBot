import escapeStringRegexp = require('escape-string-regexp');
import { regionList } from '../regions';
import { ISDEObject } from '../typings';
import { sortArrayByObjectSubPropertyLength } from './arrays';
import { fuse, items } from './items-loader';
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
  vni: 'Vexor Navy Issue'
};

export interface IGuessReturn {
  itemData: ISDEObject;
  guess: boolean;
  id: boolean;
}

export function guessUserItemInput(itemString: string): IGuessReturn {

  itemString = escapeStringRegexp(itemString);

  let regex: RegExp;
  let guess = false;
  let itemData: ISDEObject;
  const possibilities: ISDEObject[] = [];

  const itemWords = itemString.split(' ');

  // Check if the item is an ID
  const possibleId = Number(itemWords[0]);
  if (!isNaN(possibleId)) {
    possibilities.push(...items.filter((_): boolean | void => _.itemID === possibleId));
    if (possibilities.length) {
      return {itemData: possibilities[0], guess: false, id: true};
    }
  }

  // Check if word is defined as a shortcut.
  regex = new RegExp(`^${itemWords[0]}`, 'i');
  const shortcut = Object.keys(shortcuts).filter((_) => {
    return _.match(regex);
  })[0];

  if (shortcut) {
    itemWords[0] = shortcuts[shortcut];
    itemString = itemWords.join(' ');
  }

  // Check in start of the words.
  regex = new RegExp(`^${itemString}`, 'i');
  possibilities.push(...items.filter((_): RegExpMatchArray | null | void => {
    if (_.name.en) {
      return _.name.en.match(regex);
    }
  }));

  if (!possibilities.length) {
    // Check at end of the words.
    regex = new RegExp(`${itemString}$`, 'i');
    possibilities.push(...items.filter((_): RegExpMatchArray | null | void => {
      if (_.name.en) {
        return _.name.en.match(regex);
      }
    }));
  }

  if (!possibilities.length) {
    // Check in middle of words.
    possibilities.push(...items.filter((_): boolean | void => {
      if (_.name.en) {
        return _.name.en.toUpperCase().indexOf(itemString.toUpperCase()) !== -1;
      }
    }));
  }

  if (!possibilities.length) {
    // Use Fuse to search (slow but fuzzy).
    possibilities.push(fuse.search(itemString)[0] as ISDEObject);
    guess = true;
  }

  // Sort by word length and select first itemData, shortest is usually the correct one.
  itemData = sortArrayByObjectSubPropertyLength(possibilities, 'name', 'en')[0];

  return {itemData, guess, id: false};
}

export function getGuessHint(guessReturn: IGuessReturn, userInput: string): string {
  let returnString = '';

  if (!guessReturn.itemData) {
    returnString += `I don't know what you mean with "${userInput}" 😟`;
  } else if (guessReturn.guess) {
    returnString += `"${userInput}" didn't directly match any item I know of, `;
    returnString += `my best guess is ${itemFormat(guessReturn.itemData.name.en as string)}.`;
    returnString += newLine(2);
  } else if (guessReturn.id) {
    returnString += `"${itemFormat(userInput)}" looks like an item ID, `;
    returnString += `it's the ID for ${itemFormat(guessReturn.itemData.name.en as string)}.`;
    returnString += newLine(2);
  }

  return returnString;
}

export function guessUserRegionInput(regionString: string): number | void {
  for (const key in regionList) {
    if (regionList[key].toUpperCase().indexOf(regionString.toUpperCase()) !== -1 || regionString === key) {
      return Number(key);
    }
  }
}
