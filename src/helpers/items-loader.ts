import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import * as Fuse from 'fuse.js';

export function createFuse(possibilities: IUniverseNamesData): Fuse<IUniverseNamesDataUnit, {}> {
    return new Fuse(possibilities, {
        distance: 100,
        keys: ['name'],
        location: 0,
        maxPatternLength: 128,
        minMatchCharLength: 1,
        shouldSort: true,
        threshold: 0.6,
        tokenize: true,
    });
}
