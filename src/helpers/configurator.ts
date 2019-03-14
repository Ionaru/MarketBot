import fs = require('fs');
import ini = require('ini');
import path = require('path');
import { logger } from 'winston-pnp-logger';

export const configFolder = 'config';

export let config: Configurator;

type configValueType = boolean | number | string | undefined;

interface IConfig {
  [key: string]: configValueType;
}

export class Configurator {

  private config: IConfig = {};

  constructor() {
    config = this;
  }

  /**
   * Get a property from the config file
   * @param {string} property - The name of the property to fetch
   * @return {configValueType} - The value of the given config property
   */
  public getProperty(property: string): configValueType {
    const propertyParts = property.split('.');
    try {
      return this.getPropertyFromPath(propertyParts);
    } catch (error) {
      logger.warn(`Property '${property}' does not exist in the current configuration.`);
      return;
    }
  }

  /**
   * Read the config from one of the config files and store the gotten values in this.config
   */
  public addConfigFile(configName: string): void {
    // Read the config file from the config folder in the project root directory
    try {
      const configEntries = ini.parse(fs.readFileSync(path.join(configFolder, configName + '.ini'), 'utf-8'));
      Object.assign(this.config, configEntries);
      logger.info(`Config loaded: '${configName}.ini'`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Config file '${configName}.ini' not found, creating from template`);
        fs.copyFileSync(path.join(configFolder, configName + '.template.ini'), path.join(configFolder, configName + '.ini'));
        logger.info(`Config file '${configName}.ini' created, please edit the values for your configuration.`);
        return this.addConfigFile(configName);
      }
    }
  }

  private getPropertyFromPath(propertyParts: string[]) {
    let propertyPart: any = this.config;
    for (const part of propertyParts) {
      propertyPart = propertyPart[part];
    }
    if (propertyPart === undefined) {
      throw new Error('Property not found');
    }
    return propertyPart;
  }
}
