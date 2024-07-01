import { existsSync, readFileSync, unlinkSync } from "node:fs";

export const readFileContents = (
    filePath: string,
    deleteIfError = false,
): string | undefined => {
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
                } catch (error) {
                    process.emitWarning(
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        `The file ${filePath} could not be deleted, please delete manually. Reason: ${error}`,
                    );
                }
            }
        }
    }
    return undefined;
};
