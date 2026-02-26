import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequestGoogleRssJobHandler } from '../../src/modules/jobs/requestGoogleRssJob';

describe('requestGoogleRss job handler', () => {
  it('fails when spreadsheet file is missing', async () => {
    const handler = createRequestGoogleRssJobHandler('/path/that/does/not/exist.xlsx');

    await expect(
      handler({
        jobId: 'job-1',
        endpointName: '/request-google-rss/start-job',
        signal: new AbortController().signal,
        registerCancelableProcess: () => undefined
      })
    ).rejects.toThrow('Spreadsheet file not found');
  });

  it('passes spreadsheet path to legacy workflow dependency', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'request-google-rss-job-'));
    const spreadsheetPath = path.join(tempDir, 'queries.xlsx');
    await fs.writeFile(spreadsheetPath, 'mock spreadsheet data', 'utf8');

    const runLegacyWorkflow = jest.fn(async () => undefined);
    const handler = createRequestGoogleRssJobHandler(spreadsheetPath, { runLegacyWorkflow });

    await handler({
      jobId: 'job-2',
      endpointName: '/request-google-rss/start-job',
      signal: new AbortController().signal,
      registerCancelableProcess: () => undefined
    });

    expect(runLegacyWorkflow).toHaveBeenCalledWith({
      jobId: 'job-2',
      spreadsheetPath,
      signal: expect.any(Object)
    });

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
