import {
  makeBoldEndTag,
  makeBoldStartTag,
  makeCodeEndTag,
  makeCodeStartTag,
  makeItalicsEndTag,
  makeItalicsStartTag,
  makeUrlEndTag,
  makeUrlStartTag,
  makeUserLinkEndTag,
  makeUserLinkStartTag,
  newLineTag
} from '../chat-service/discord-interface';

export function makeBold(string: string | number): string {
  return `${makeBoldStartTag}${string}${makeBoldEndTag}`;
}

export function makeItalics(string: string | number): string {
  return `${makeItalicsStartTag}${string}${makeItalicsEndTag}`;
}

export function makeCode(string: string | number): string {
  return `${makeCodeStartTag}${string}${makeCodeEndTag}`;
}

export function makeURL(string: string | number): string {
  return `${makeUrlStartTag}${string}${makeUrlEndTag}`;
}

export function makeUserLink(string: string | number): string {
  return `${makeUserLinkStartTag}${string}${makeUserLinkEndTag}`;
}

export function newLine(amount = 1): string {
  return newLineTag.repeat(amount);
}

export function itemFormat(string: string | number): string {
  return makeCode(string);
}

export function regionFormat(string: string | number): string {
  return makeBold(string);
}
