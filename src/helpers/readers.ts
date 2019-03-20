import * as fs from 'fs';
import { logger } from 'winston-pnp-logger';

import { version } from '../../package.json';

export function readVersion(): string {
    return version;
}

export function readFileContents(filePath: string, deleteIfError = false): string | undefined {
    if (fs.existsSync(filePath)) {
        try {
            return fs.readFileSync(filePath).toString();
        } catch {
            logger.warn(`The file ${filePath} could not be read.`);
            if (deleteIfError) {
                logger.warn(`Deleting the file ${filePath}.`);
                try {
                    fs.unlinkSync(filePath);
                    logger.warn(`File ${filePath} deleted.`);
                } catch (e) {
                    logger.warn(`The file ${filePath} could not be deleted, please delete manually. Reason: ${e}`);
                }
            }
        }
    }
    return;
}
