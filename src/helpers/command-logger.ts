import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { logger } from 'winston-pnp-logger';

import { Message } from '../chat-service/discord/message';
import { config } from './configurator';
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
  logger.debug(message.content);

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

  if (config.getProperty('elastic.enabled') === true && transaction) {
    transaction.setTag('channel_id', newLogEntry.channel_id);
    transaction.setTag('channel_name', newLogEntry.channel_name);
    transaction.setTag('channel_type', newLogEntry.channel_type);
    transaction.setTag('command_full', newLogEntry.command_full);
    transaction.setTag('command_type', newLogEntry.command_type);
    transaction.setTag('guild_id', newLogEntry.guild_id);
    transaction.setTag('guild_name', newLogEntry.guild_name);
    transaction.setTag('item_input', newLogEntry.item_input);
    transaction.setTag('item_output', newLogEntry.item_output);
    transaction.setTag('region_input', newLogEntry.region_input);
    transaction.setTag('region_output', newLogEntry.region_output);
    transaction.setTag('sender_id', newLogEntry.sender_id);
    transaction.setTag('sender_name', newLogEntry.sender_name);
    transaction.end();
  }

  if (config.getProperty('logging.enabled') === true) {
    newLogEntry.save().then();
  }
}
