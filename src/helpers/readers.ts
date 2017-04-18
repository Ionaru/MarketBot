import * as fs from 'fs';
import * as jsyaml from 'js-yaml';

export function readTypeIDs(path): Object {
  return jsyaml.load(fs.readFileSync(path).toString());
}

export function readToken(path): string {
  return fs.readFileSync(path).toString();
}
