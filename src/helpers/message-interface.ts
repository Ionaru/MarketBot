import * as Discord from 'discord.js';

const boldStartTag = '**';
const boldEndTag = '**';

const italicsStartTag = '*';
const italicsEndTag = '*';

const codeStartTag = '\'';
const codeEndTag = '\'';

const newLineTag = '\n';

export function makeBold(string): string {
  return `${boldStartTag}${string}${boldEndTag}`;
}

export function makeCode(string): string {
  return `${codeStartTag}${string}${codeEndTag}`;
}

export function makeItalics(string): string {
  return `${italicsStartTag}${string}${italicsEndTag}`;
}

export function newLine(amount = 1): string {
  return newLineTag.repeat(amount);
}

export function sendMessage(): string {
  return '';
}

export function getUsername() {

}

export class Message {

  private _origin: string;
  private _sender: string;
  private _author: string;
  private _channel: string;
  private _server: string;
  private _content: string;
  private _replyFunction: (content?: Discord.StringResolvable, options?: Discord.WebhookMessageOptions) =>
    Promise<Discord.Message | Discord.Message[]>;

  constructor(message: Discord.Message) {
    this._sender = message.author.username;
    this._replyFunction = message.reply;
    this._content = message.content;
    this._author = message.author.tag;
    this._origin = 'Discord';
  }

  get server(): string {
    return this._server;
  }
  get channel(): string {
    return this._channel;
  }
  get author(): string {
    return this._author;
  }

  get sender(): string {
    return this._sender;
  }

  get content(): string {
    return this._content;
  }

  get replyFunction(): any {
    return this._replyFunction;
  }

  get origin(): string {
    return this._origin;
  }

  async reply(message: string): Promise<Discord.Message> {
    return await this.replyFunction(message, {reply: null});
  }
}
