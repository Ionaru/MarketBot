/* eslint-disable @typescript-eslint/naming-convention */
import { Transaction } from 'elastic-apm-node';
import { CommandContext } from 'slash-create';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { debug } from '../debug';
import { configuration } from '../index';

export const getCommand = (context: CommandContext): string => {
    const command = context.commandName;
    const options = Object.entries(context.options).map(([key, value]) => `${key}:${value}`).join(' ');
    return `/${command} ${options}`;
};
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

export const logSlashCommand = (message: CommandContext, outputItem?: string, outputRegion?: string, transaction?: any) => {
    const command = getCommand(message);
    debug(command);

    const newLogEntry = new LogEntry();

    newLogEntry.guild_id = message.guildID;
    newLogEntry.channel_id = message.channelID;
    newLogEntry.channel_type = message.guildID ? 'GUILD_TEXT' : 'dm';
    newLogEntry.command_type = message.commandName;
    newLogEntry.command_full = command;
    newLogEntry.item_input = message.options.item;
    newLogEntry.item_output = outputItem;
    newLogEntry.region_input = message.options.region;
    newLogEntry.region_output = outputRegion;
    newLogEntry.sender_id = message.user.id;
    newLogEntry.sender_name = `${message.user.username}#${message.user.discriminator}`;

    if (configuration.getProperty('elastic.enabled') === true && transaction) {
        finishTransaction(transaction, newLogEntry);
    }

    if (configuration.getProperty('logging.enabled') === true) {
        newLogEntry.save().then();
    }
};

const finishTransaction = (transaction: Transaction, logEntry: LogEntry): void => {
    transaction.setLabel('channel_id',logEntry.channel_id);
    transaction.setLabel('channel_name',logEntry.channel_name);
    transaction.setLabel('channel_type',logEntry.channel_type);
    transaction.setLabel('command_full',logEntry.command_full);
    transaction.setLabel('command_type',logEntry.command_type);
    transaction.setLabel('guild_id', logEntry.guild_id);
    transaction.setLabel('guild_name',logEntry.guild_name);
    transaction.setLabel('item_input',logEntry.item_input);
    transaction.setLabel('item_output', logEntry.item_output);
    transaction.setLabel('region_input',logEntry.region_input);
    transaction.setLabel('region_output',logEntry.region_output);
    transaction.setLabel('sender_id', logEntry.sender_id);
    transaction.setLabel('sender_name', logEntry.sender_name);
    transaction.end();
};
