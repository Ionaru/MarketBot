import escapeStringRegexp = require('escape-string-regexp');

import { fuse, items } from '../market-bot';
import { regionList } from '../regions';
import { ISDEObject } from '../typings';
import { sortArrayByObjectPropertyLength } from './arrays';

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

export function guessUserItemInput(itemString: string): ISDEObject {

  itemString = escapeStringRegexp(itemString);

  let itemData;

  let regex: RegExp;
  let possibilities: ISDEObject[] = [];

  const itemWords = itemString.split(' ');

  // Check if word is defined as a shortcut
  regex = new RegExp(`^${itemWords[0]}`, 'i');
  const shortcut = Object.keys(shortcuts).filter((_) => {
    return _.match(regex);
  })[0];

  if (shortcut) {
    itemWords[0] = shortcuts[shortcut];
    itemString = itemWords.join(' ');
  }

  // Check in start of the words
  regex = new RegExp(`^${itemString}`, 'i');
  possibilities.push(...items.filter((_): RegExpMatchArray | null | void => {
    if (_.name.en) {
      return _.name.en.match(regex);
    }
  }));

  if (!possibilities.length) {
    // Check at end of the words
    regex = new RegExp(`${itemString}$`, 'i');
    possibilities.push(...items.filter((_): RegExpMatchArray | null | void => {
      if (_.name.en) {
        return _.name.en.match(regex);
      }
    }));

    if (!possibilities.length) {
      // Check in middle of words
      possibilities.push(...items.filter((_): boolean | void => {
        if (_.name.en) {
          return _.name.en.toUpperCase().indexOf(itemString.toUpperCase()) !== -1;
        }
      }));
    }
  }

  if (possibilities.length) {
    // Sort by word length, shortest is usually the correct one
    possibilities = sortArrayByObjectPropertyLength(possibilities, 'name', 'en');
    itemData = possibilities[0];
  } else {
    itemData = fuse.search(itemString)[0] as ISDEObject;
  }

  return itemData;
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
