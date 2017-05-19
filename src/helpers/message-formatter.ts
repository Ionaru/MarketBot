import { makeBold, makeCode } from './message-interface';

export function itemFormat(string): string {
  return makeCode(string);
}

export function regionFormat(string): string {
  return makeBold(string);
}

// export function itemFormat(string): string {
//
// }
