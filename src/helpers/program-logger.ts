import winston = require('winston');
import WinstonDRF = require('winston-daily-rotate-file');
import mkdirp = require('mkdirp');
import path = require('path');

import TransportInstance = winston.TransportInstance;
import LoggerInstance = winston.LoggerInstance;

export let logger: Logger;

export class Logger {

  private logger: LoggerInstance;
  public info: any;
  public warn: any;
  public error: any;
  public debug: any;

  constructor() {
    let transports = this.createTransports();
    if (process.env.SILENT === 'true') {
      transports = [
        new winston.transports.Console({
          level: 'error',
          timestamp: function (): string {
            return Logger.getLogTimeStamp();
          },
          colorize: true
        })
      ];
    }

    this.logger = new (winston.Logger)({transports: transports});
    this.info = this.logger.info;
    this.warn = this.logger.warn;
    this.error = this.logger.error;
    this.debug = this.logger.debug;

    this.info('Winston logger enabled');
  }

  private createTransports(): Array<TransportInstance> {
    const consoleLogLevel = process.env.LEVEL || 'info';
    const transports = [];

    transports.push(
      new winston.transports.Console({
        level: consoleLogLevel,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        colorize: true
      }));

    const logDirs = {
      debug: path.join(__dirname, '../../logs/debug/'),
      info: path.join(__dirname, '../../logs/info/'),
      warn: path.join(__dirname, '../../logs/warning/'),
      error: path.join(__dirname, '../../logs/error/'),
    };

    for (const dirKey in logDirs) {
      if (logDirs[dirKey]) {
        mkdirp.sync(logDirs[dirKey]);
      }
    }

    const debugFilePath = logDirs.debug + '_plain.log';
    const logFilePath = logDirs.info + '_plain.log';
    const warnFilePath = logDirs.warn + '_plain.log';
    const errFilePath = logDirs.error + '_plain.log';
    const debugFileJSONPath = logDirs.debug + '_json.log';
    const logFileJSONPath = logDirs.info + '_json.log';
    const warnFileJSONPath = logDirs.warn + '_json.log';
    const errFileJSONPath = logDirs.error + '_json.log';

    transports.push(
      new WinstonDRF({
        name: 'file#debug',
        datePattern: 'log_yyyy-MM-dd',
        level: 'debug',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: debugFilePath,
        json: false
      }));

    transports.push(
      new WinstonDRF({
        name: 'file#log',
        datePattern: 'log_yyyy-MM-dd',
        level: 'info',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: logFilePath,
        json: false
      }));

    transports.push(
      new WinstonDRF({
        name: 'file#warn',
        datePattern: 'log_yyyy-MM-dd',
        level: 'warn',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: warnFilePath,
        json: false
      }));

    transports.push(
      new WinstonDRF({
        name: 'file#error',
        datePattern: 'log_yyyy-MM-dd',
        level: 'error',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: errFilePath,
        json: false
      }));

    transports.push(
      new WinstonDRF({
        name: 'file#jsondebug',
        datePattern: 'log_yyyy-MM-dd',
        level: 'debug',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: debugFileJSONPath
      }));

    transports.push(
      new WinstonDRF({
        name: 'file#jsonlog',
        datePattern: 'log_yyyy-MM-dd',
        level: 'info',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: logFileJSONPath
      }));

    transports.push(
      new WinstonDRF({
        name: 'file#jsonwarn',
        datePattern: 'log_yyyy-MM-dd',
        level: 'warn',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: warnFileJSONPath
      }));

    transports.push(
      new WinstonDRF({
        name: 'file#jsonerror',
        datePattern: 'log_yyyy-MM-dd',
        level: 'error',
        prepend: true,
        timestamp: function (): string {
          return Logger.getLogTimeStamp();
        },
        filename: errFileJSONPath
      }));

    return transports;
  }

  private static getLogTimeStamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const hour = ('0' + now.getHours()).slice(-2);
    const minute = ('0' + now.getMinutes()).slice(-2);
    const second = ('0' + now.getSeconds()).slice(-2);
    const date = [year, month, day].join('-');
    const time = [hour, minute, second].join(':');
    return [date, time].join(' ');
  };
}
