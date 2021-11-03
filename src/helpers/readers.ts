import { existsSync, readFileSync, unlinkSync } from 'fs';

export const readFileContents = (filePath: string, deleteIfError = false): string | undefined => {
    if (existsSync(filePath)) {
        try {
            return readFileSync(filePath).toString();
        } catch {
            process.emitWarning(`The file ${filePath} could not be read.`);
            if (deleteIfError) {
                process.emitWarning(`Deleting the file ${filePath}.`);
                try {
                    unlinkSync(filePath);
                    process.emitWarning(`File ${filePath} deleted.`);
                } catch (e) {
                    process.emitWarning(`The file ${filePath} could not be deleted, please delete manually. Reason: ${e}`);
                }
            }
        }
    }
    return undefined;
};
