import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Command } from '../chat-service/command';
import { Message } from '../chat-service/discord/message';
import { configuration } from '../index';
import { parseMessage } from './parsers';

// tslint:disable:variable-name
@Entity('LogEntries')
export class LogEntry extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Column({nullable: true})
    public guild_id?: string;

    @Column({nullable: true})
    public guild_name?: string;

    @Column({nullable: true})
    public channel_id?: string;

    @Column({nullable: true})
    public channel_name?: string;

    @Column()
    public channel_type!: string;

    @Column()
    public sender_name!: string;

    @Column()
    public sender_id!: string;

    @Column({nullable: true})
    public item_input?: string;

    @Column({nullable: true})
    public item_output?: string;

    @Column({nullable: true})
    public region_input?: string;

    @Column({nullable: true})
    public region_output?: string;

    @Column()
    public command_type!: string;

    @Column({type: 'text'})
    public command_full!: string;
}

export function logCommand(commandType: string, message: Message, outputItem?: string, outputRegion?: string, transaction?: any) {
    Command.debug(message.content);

    const parsedMessage = parseMessage(message.content);

    const newLogEntry = new LogEntry();
    newLogEntry.channel_id = message.channel.id;
    newLogEntry.channel_name = message.channel.name;
    newLogEntry.channel_type = message.channel.type;
    newLogEntry.command_full = message.content;
    newLogEntry.command_type = commandType;
    newLogEntry.guild_id = message.server.id;
    newLogEntry.guild_name = message.server.name;
    newLogEntry.item_input = parsedMessage.item;
    newLogEntry.item_output = outputItem;
    newLogEntry.region_input = parsedMessage.region;
    newLogEntry.region_output = outputRegion;
    newLogEntry.sender_id = message.author.id;
    newLogEntry.sender_name = message.author.name;

    if (configuration.getProperty('elastic.enabled') === true && transaction) {
        transaction.setLabel('channel_id', newLogEntry.channel_id);
        transaction.setLabel('channel_name', newLogEntry.channel_name);
        transaction.setLabel('channel_type', newLogEntry.channel_type);
        transaction.setLabel('command_full', newLogEntry.command_full);
        transaction.setLabel('command_type', newLogEntry.command_type);
        transaction.setLabel('guild_id', newLogEntry.guild_id);
        transaction.setLabel('guild_name', newLogEntry.guild_name);
        transaction.setLabel('item_input', newLogEntry.item_input);
        transaction.setLabel('item_output', newLogEntry.item_output);
        transaction.setLabel('region_input', newLogEntry.region_input);
        transaction.setLabel('region_output', newLogEntry.region_output);
        transaction.setLabel('sender_id', newLogEntry.sender_id);
        transaction.setLabel('sender_name', newLogEntry.sender_name);
        transaction.end();
    }

    if (configuration.getProperty('logging.enabled') === true) {
        newLogEntry.save().then();
    }
}
