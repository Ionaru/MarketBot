import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import Fuse from 'fuse.js';

export const createFuse = (possibilities: IUniverseNamesData): Fuse<IUniverseNamesDataUnit> => new Fuse(possibilities, {
    distance: 100,
    keys: ['name'],
    location: 0,
    minMatchCharLength: 1,
    shouldSort: true,
    threshold: 0.6,
});
