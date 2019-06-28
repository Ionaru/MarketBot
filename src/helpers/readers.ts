import * as fs from 'fs';

import { version } from '../../package.json';

export function readVersion(): string {
    return version;
}

export function readFileContents(filePath: string, deleteIfError = false): string | undefined {
    if (fs.existsSync(filePath)) {
        try {
            return fs.readFileSync(filePath).toString();
        } catch {
            process.emitWarning(`The file ${filePath} could not be read.`);
            if (deleteIfError) {
                process.emitWarning(`Deleting the file ${filePath}.`);
                try {
                    fs.unlinkSync(filePath);
                    process.emitWarning(`File ${filePath} deleted.`);
                } catch (e) {
                    process.emitWarning(`The file ${filePath} could not be deleted, please delete manually. Reason: ${e}`);
                }
            }
        }
    }
    return;
}
