import fs from 'node:fs/promises';
import { QueueExecutionContext } from '../queue/queueEngine';

export interface RequestGoogleRssJobContext {
  jobId: string;
  spreadsheetPath: string;
  signal: AbortSignal;
}

export interface RequestGoogleRssJobDependencies {
  runLegacyWorkflow?: (context: RequestGoogleRssJobContext) => Promise<void>;
}

export const verifySpreadsheetFileExists = async (spreadsheetPath: string): Promise<void> => {
  try {
    const fileStat = await fs.stat(spreadsheetPath);
    if (!fileStat.isFile()) {
      throw new Error(`Spreadsheet path is not a file: ${spreadsheetPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Spreadsheet file not found: ${spreadsheetPath}`);
    }
    throw error;
  }
};

const runLegacyWorkflowPlaceholder = async (_context: RequestGoogleRssJobContext): Promise<void> => {
  // Legacy NewsNexusRequesterGoogleRss04 behavior will be absorbed in later integration tasks.
};

export const createRequestGoogleRssJobHandler = (
  spreadsheetPath: string,
  dependencies: RequestGoogleRssJobDependencies = {}
) => {
  const runLegacyWorkflow = dependencies.runLegacyWorkflow ?? runLegacyWorkflowPlaceholder;

  return async (queueContext: QueueExecutionContext): Promise<void> => {
    await verifySpreadsheetFileExists(spreadsheetPath);

    await runLegacyWorkflow({
      jobId: queueContext.jobId,
      spreadsheetPath,
      signal: queueContext.signal
    });
  };
};
