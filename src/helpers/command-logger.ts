import SequelizeStatic = require('sequelize');
import Instance = SequelizeStatic.Instance;
import { Database } from 'sqlite3';
import { logger } from 'winston-pnp-logger';

import { Message } from '../chat-service/discord/message';
import { parseMessage } from './parsers';

export let logEntry: any;

export interface ILogEntryAttr {
  guild_id?: string;
  guild_name?: string;
  channel_id?: string;
  channel_name?: string;
  channel_type: string;
  sender_name: string;
  sender_id: string;
  item_input?: string;
  item_output?: string;
  region_input?: string;
  region_output?: string;
  command_type?: string;
  command_full?: string;
}

/* tslint:disable:no-empty-interface */
export interface ILogEntryInstance extends Instance<ILogEntryAttr>, ILogEntryAttr {}

/* tslint:enable:no-unused-variable */

export async function startLogger(): Promise<void> {
  new Database('botlog.db').close();

  // noinspection JSUnusedGlobalSymbols
  const sequelizeDatabase = new SequelizeStatic('sqlite://botlog.db', {
    dialect: 'sqlite',
    logging: (str: string) => {
      logger.debug(str);
    }
  });

  sequelizeDatabase
    .authenticate()
    .then(() => {
      logger.info('Connection to logging database has been established successfully');
    }, (err) => {
      logger.error('Unable to connect to the database:', err);
    });

  logEntry = await sequelizeDatabase.define('LogEntry', {
    channel_id: SequelizeStatic.STRING,
    channel_name: SequelizeStatic.STRING,
    channel_type: SequelizeStatic.STRING,
    command_full: SequelizeStatic.TEXT,
    command_type: SequelizeStatic.STRING,
    guild_id: SequelizeStatic.STRING,
    guild_name: SequelizeStatic.STRING,
    item_input: SequelizeStatic.STRING,
    item_output: SequelizeStatic.STRING,
    region_input: SequelizeStatic.STRING,
    region_output: SequelizeStatic.STRING,
    sender_id: SequelizeStatic.STRING,
    sender_name: SequelizeStatic.STRING
  }).sync();
}

export function logCommand(commandType: string, discordMessage: Message, outputItem?: string, outputRegion?: string) {
  logger.debug(discordMessage.content);

  const parsedMessage = parseMessage(discordMessage.content);

  const logData: ILogEntryAttr = {
    channel_id: discordMessage.channel.id,
    channel_name: discordMessage.channel.name,
    channel_type: discordMessage.channel.type,
    command_full: discordMessage.content,
    command_type: commandType,
    guild_id: discordMessage.server.id,
    guild_name: discordMessage.server.name,
    item_input: parsedMessage.item,
    item_output: outputItem,
    region_input: parsedMessage.region,
    region_output: outputRegion,
    sender_id: discordMessage.author.id,
    sender_name: discordMessage.author.name
  };

  logEntry.create(logData).then();
}
