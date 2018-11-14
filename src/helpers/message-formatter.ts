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
  newLineTag,
} from '../chat-service/discord/misc';

export function makeBold(text: string | number): string {
  return `${makeBoldStartTag}${text}${makeBoldEndTag}`;
}

export function makeItalics(text: string | number): string {
  return `${makeItalicsStartTag}${text}${makeItalicsEndTag}`;
}

export function makeCode(text: string | number): string {
  return `${makeCodeStartTag}${text}${makeCodeEndTag}`;
}

export function makeURL(text: string | number): string {
  return `${makeUrlStartTag}${text}${makeUrlEndTag}`;
}

export function makeUserLink(text: string): string {
  return `${makeUserLinkStartTag}${text}${makeUserLinkEndTag}`;
}

export function newLine(amount = 1): string {
  return newLineTag.repeat(amount);
}

export function itemFormat(text: string | number): string {
  return makeCode(text);
}

export function regionFormat(text: string | number): string {
  return makeBold(text);
}
