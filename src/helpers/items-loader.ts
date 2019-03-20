import * as Fuse from 'fuse.js';

import { INamesData } from '../typings';

export function createFuse(possibilities: INamesData[]): Fuse<INamesData> {
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
