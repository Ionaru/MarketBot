import { SDEObject } from '../typings';
import { fuse, items } from '../market-bot';
import { sortArrayByObjectPropertyLength } from './arrays';
import { regionList } from '../regions';
import * as escapeStringRegexp from 'escape-string-regexp';

export const shortcuts = {
  'bcs': 'Ballistic Control System',
  'dc': 'Damage Control',
  'dda': 'Drone Damage Amplifier',
  'dni': 'Dominix Navy Issue',
  'fnc': 'Federation Navy Comet',
  'hfi': 'Hurricane Fleet Issue',
  'mni': 'Megathron Navy Issue',
  'mlu': 'Mining Laser Upgrade',
  'mtu': 'Mobile Tractor Unit',
  'rni': 'Raven Navy Issue',
  'vni': 'Vexor Navy Issue',
};

export function guessUserItemInput(itemString: string): SDEObject {

  itemString = escapeStringRegexp(itemString);

  let itemData;

  let regex: RegExp;
  let possibilities: Array<SDEObject> = [];

  const itemWords = itemString.split(' ');

  // Check if word is defined as a shortcut
  regex = new RegExp(`^${itemWords[0]}`, 'i');
  const shortcut = Object.keys(shortcuts).filter(_ => {
    return _.match(regex);
  })[0];

  if (shortcut) {
    itemWords[0] = shortcuts[shortcut];
    itemString = itemWords.join(' ');
  }

  // Check in start of the words
  regex = new RegExp(`^${itemString}`, 'i');
  possibilities.push(...items.filter(_ => {
    if (_.name.en) {
      return _.name.en.match(regex);
    }
  }));

  if (!possibilities.length) {
    // Check at end of the words
    regex = new RegExp(`${itemString}$`, 'i');
    possibilities.push(...items.filter(_ => {
      if (_.name.en) {
        return _.name.en.match(regex);
      }
    }));

    if (!possibilities.length) {
      // Check in middle of words
      possibilities.push(...items.filter(_ => {
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
    itemData = <SDEObject> fuse.search(itemString)[0];
  }

  return itemData;
}

export function guessUserRegionInput(regionString: string): number {
  for (const key in regionList) {
    if (regionList.hasOwnProperty(key)) {
      if (regionList[key].toUpperCase().indexOf(regionString.toUpperCase()) !== -1) {
        return Number(key);
      }
    }
  }
}
