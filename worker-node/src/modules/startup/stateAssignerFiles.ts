import fs from 'node:fs/promises';
import path from 'node:path';

export interface StateAssignerDirectories {
  rootDir: string;
  chatGptResponsesDir: string;
  promptsDir: string;
}

export const resolveStateAssignerDirectories = (
  pathToStateAssignerFiles: string
): StateAssignerDirectories => {
  const rootDir = pathToStateAssignerFiles.trim();

  return {
    rootDir,
    chatGptResponsesDir: path.join(rootDir, 'chatgpt_responses'),
    promptsDir: path.join(rootDir, 'prompts')
  };
};

export const ensureStateAssignerDirectories = async (
  pathToStateAssignerFiles: string
): Promise<StateAssignerDirectories> => {
  const directories = resolveStateAssignerDirectories(pathToStateAssignerFiles);

  await fs.mkdir(directories.rootDir, { recursive: true });
  await fs.mkdir(directories.chatGptResponsesDir, { recursive: true });
  await fs.mkdir(directories.promptsDir, { recursive: true });

  return directories;
};
