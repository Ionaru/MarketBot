import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { logger } from 'winston-pnp-logger';

import { Message } from '../chat-service/discord/message';
import { parseMessage } from './parsers';

// tslint:disable:variable-name
@Entity('LogEntries')
export class LogEntry extends BaseEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({nullable: true})
  public guild_id?: string;

  @Column({nullable: true})
  public guild_name?: string;

  @Column({nullable: true})
  public channel_id?: string;

  @Column({nullable: true})
  public channel_name?: string;

  @Column()
  public channel_type: string;

  @Column()
  public sender_name: string;

  @Column()
  public sender_id: string;

  @Column({nullable: true})
  public item_input?: string;

  @Column({nullable: true})
  public item_output?: string;

  @Column({nullable: true})
  public region_input?: string;

  @Column({nullable: true})
  public region_output?: string;

  @Column()
  public command_type: string;

  @Column({type: 'text'})
  public command_full: string;
}

export function logCommand(commandType: string, discordMessage: Message, outputItem?: string, outputRegion?: string) {
  logger.debug(discordMessage.content);

  const parsedMessage = parseMessage(discordMessage.content);

  const newLogEntry = new LogEntry();
  newLogEntry.channel_id = discordMessage.channel.id;
  newLogEntry.channel_name = discordMessage.channel.name;
  newLogEntry.channel_type = discordMessage.channel.type;
  newLogEntry.command_full = discordMessage.content;
  newLogEntry.command_type = commandType;
  newLogEntry.guild_id = discordMessage.server.id;
  newLogEntry.guild_name = discordMessage.server.name;
  newLogEntry.item_input = parsedMessage.item;
  newLogEntry.item_output = outputItem;
  newLogEntry.region_input = parsedMessage.region;
  newLogEntry.region_output = outputRegion;
  newLogEntry.sender_id = discordMessage.author.id;
  newLogEntry.sender_name = discordMessage.author.name;
  newLogEntry.save().then();
}
