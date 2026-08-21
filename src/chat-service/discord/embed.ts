/* eslint-disable @typescript-eslint/naming-convention */
import { EmbedAuthorOptions, EmbedField, EmbedImageOptions, MessageEmbedOptions } from 'slash-create';

/**
 * A minimal embed builder producing slash-create's MessageEmbedOptions.
 *
 * These embeds are only ever handed to slash-create's context.send(), never to
 * discord.js, so building discord.js structures here meant a type mismatch that
 * used to be silenced with @ts-ignore. The method signatures match the discord.js
 * v13 MessageEmbed this replaces, so call sites are unchanged.
 */
export class MessageEmbed implements MessageEmbedOptions {

    public author?: EmbedAuthorOptions;
    public description?: string;
    public fields?: EmbedField[];
    public thumbnail?: EmbedImageOptions;
    public title?: string;

    public addField(name: string, value: string, inline = false): this {
        this.fields = [...this.fields ?? [], {inline, name, value}];
        return this;
    }

    public setAuthor(name: string, iconUrl?: string, url?: string): this {
        this.author = {icon_url: iconUrl, name, url};
        return this;
    }

    public setDescription(description: string): this {
        this.description = description;
        return this;
    }

    public setThumbnail(url: string): this {
        this.thumbnail = {url};
        return this;
    }

    public setTitle(title: string): this {
        this.title = title;
        return this;
    }
}
