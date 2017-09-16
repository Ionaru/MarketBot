import escapeStringRegexp = require('escape-string-regexp');
import { regionList } from '../regions';
import { ISDEObject } from '../typings';
import { sortArrayByObjectPropertyLength } from './arrays';
import { fuse, items } from './items-loader';

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
}

export function guessUserItemInput(itemString: string): IGuessReturn {

  itemString = escapeStringRegexp(itemString);

  let regex: RegExp;
  let guess = false;
  let itemData: ISDEObject;
  const possibilities: ISDEObject[] = [];

  const itemWords = itemString.split(' ');

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
  itemData = sortArrayByObjectPropertyLength(possibilities, 'name', 'en')[0];

  return {itemData, guess};
}

export function guessUserRegionInput(regionString: string): number | void {
  for (const key in regionList) {
    if (regionList.hasOwnProperty(key)) {
      if (regionList[key].toUpperCase().indexOf(regionString.toUpperCase()) !== -1) {
        return Number(key);
      }
    }
  }
}
