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

export function makeBold(string: string): string {
  return `${makeBoldStartTag}${string}${makeBoldEndTag}`;
}

export function makeItalics(string: string): string {
  return `${makeItalicsStartTag}${string}${makeItalicsEndTag}`;
}

export function makeCode(string: string): string {
  return `${makeCodeStartTag}${string}${makeCodeEndTag}`;
}

export function makeURL(string: string): string {
  return `${makeUrlStartTag}${string}${makeUrlEndTag}`;
}

export function makeUserLink(string: string): string {
  return `${makeUserLinkStartTag}${string}${makeUserLinkEndTag}`;
}

export function newLine(amount = 1): string {
  return newLineTag.repeat(amount);
}

export function itemFormat(string): string {
  return makeCode(string);
}

export function regionFormat(string): string {
  return makeBold(string);
}
