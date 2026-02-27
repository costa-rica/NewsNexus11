import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ensureStateAssignerDirectories,
  resolveStateAssignerDirectories
} from '../../src/modules/startup/stateAssignerFiles';

describe('stateAssigner files startup module', () => {
  it('resolves expected subdirectories under PATH_TO_STATE_ASSIGNER_FILES', () => {
    const resolved = resolveStateAssignerDirectories('/tmp/state-assigner');

    expect(resolved).toEqual({
      rootDir: '/tmp/state-assigner',
      chatGptResponsesDir: '/tmp/state-assigner/chatgpt_responses',
      promptsDir: '/tmp/state-assigner/prompts'
    });
  });

  it('creates root, chatgpt_responses, and prompts directories', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'state-assigner-files-'));
    const stateAssignerRoot = path.join(tempDir, 'state-assigner-files');

    const resolved = await ensureStateAssignerDirectories(stateAssignerRoot);

    const rootStat = await fs.stat(resolved.rootDir);
    const responsesStat = await fs.stat(resolved.chatGptResponsesDir);
    const promptsStat = await fs.stat(resolved.promptsDir);

    expect(rootStat.isDirectory()).toBe(true);
    expect(responsesStat.isDirectory()).toBe(true);
    expect(promptsStat.isDirectory()).toBe(true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
