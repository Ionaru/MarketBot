import * as fs from 'fs';
import * as jsyaml from 'js-yaml';

import { ITypeIDs } from '../typings';

export function readTypeIDs(path: string): ITypeIDs {
  return jsyaml.load(fs.readFileSync(path).toString());
}

export function readToken(path: string): string {
  return fs.readFileSync(path).toString().trim();
}
