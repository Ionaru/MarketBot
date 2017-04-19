import * as sqlite3 from 'sqlite3';
import * as Discord from 'discord.js';
import { parseMessage } from './parsers';
import SequelizeStatic = require('sequelize');
import Instance = SequelizeStatic.Instance;
import Model = SequelizeStatic.Model;

export let logEntry;

export interface LogEntry {
  guild_id?: string;
  guild_name?: string;
  channel_id?: string;
  channel_name?: string;
  channel_type?: 'text' | 'dm' | 'group' | 'voice';
  sender_name?: string;
  sender_discriminator?: number;
  sender_id?: string;
  item_input?: string;
  item_output?: string;
  region_input?: string;
  region_output?: string;
  command_type?: string;
  command_full?: string;
}

export async function startLogger() {
  const db = new sqlite3.Database('botlog.db').close();

  const sequelizeDatabase = new SequelizeStatic('sqlite://botlog.db', {
    dialect: 'sqlite',
    logging: null
  });

  sequelizeDatabase
    .authenticate()
    .then(function () {
      console.log('Connection to database has been established successfully.');
    }, function (err) {
      console.error('Unable to connect to the database:', err);
    });

  logEntry = await sequelizeDatabase.define('LogEntry', {
    guild_id: SequelizeStatic.STRING,
    guild_name: SequelizeStatic.STRING,
    channel_id: SequelizeStatic.STRING,
    channel_name: SequelizeStatic.STRING,
    channel_type: SequelizeStatic.STRING,
    sender_name: SequelizeStatic.STRING,
    sender_discriminator: SequelizeStatic.INTEGER,
    sender_id: SequelizeStatic.STRING,
    item_input: SequelizeStatic.STRING,
    item_output: SequelizeStatic.STRING,
    region_input: SequelizeStatic.STRING,
    region_output: SequelizeStatic.STRING,
    command_type: SequelizeStatic.STRING,
    command_full: SequelizeStatic.TEXT,
  }).sync({force: false});
}

export function logCommand(commandType: string, discordMessage: Discord.Message, outputItem?, outputRegion?) {
  const parsedMessage = parseMessage(discordMessage);

  const logData: LogEntry = {
    sender_name: discordMessage.author.username,
    sender_discriminator: Number(discordMessage.author.discriminator),
    sender_id: discordMessage.author.id,
    channel_type: discordMessage.channel.type,
    command_type: commandType,
    command_full: discordMessage.content,
    item_input: parsedMessage.item,
    item_output: outputItem,
    region_input: parsedMessage.region,
    region_output: outputRegion,
  };

  if (discordMessage.channel.type === 'text') {
    discordMessage.channel = <Discord.TextChannel> discordMessage.channel;

    logData.guild_id = discordMessage.guild.id;
    logData.guild_name = discordMessage.guild.name;
    logData.channel_id = discordMessage.channel.id;
    logData.channel_name = discordMessage.channel.name;
  }

  logEntry.create(logData).then();
}
