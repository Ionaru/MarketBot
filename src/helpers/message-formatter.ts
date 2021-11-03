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

export const makeBold = (text: string | number): string => `${ makeBoldStartTag }${ text }${ makeBoldEndTag }`;

export const makeItalics = (text: string | number): string => `${ makeItalicsStartTag }${ text }${ makeItalicsEndTag }`;

export const makeCode = (text: string | number): string => `${ makeCodeStartTag }${ text }${ makeCodeEndTag }`;

export const makeURL = (text: string | number): string => `${ makeUrlStartTag }${ text }${ makeUrlEndTag }`;

export const makeUserLink = (text: string): string => `${ makeUserLinkStartTag }${ text }${ makeUserLinkEndTag }`;

export const newLine = (amount = 1): string => newLineTag.repeat(amount);

export const itemFormat = (text: string | number): string => makeCode(text);

export const regionFormat = (text: string | number): string => makeBold(text);
