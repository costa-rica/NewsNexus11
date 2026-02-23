jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  safeFilePath,
  safeFileExists,
  safeDirExists,
} from '../../src/middleware/fileSecurity';

describe('fileSecurity middleware helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'newsnexus-file-sec-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('safeFilePath returns resolved file path for valid input', () => {
    const output = safeFilePath(tempDir, 'report.xlsx', {
      allowedExtensions: ['.xlsx'],
    });

    expect(output).toBe(path.resolve(path.join(tempDir, 'report.xlsx')));
  });

  test('safeFilePath rejects disallowed extension', () => {
    const output = safeFilePath(tempDir, 'report.exe', {
      allowedExtensions: ['.xlsx'],
    });

    expect(output).toBeNull();
  });

  test('safeFileExists validates existing file', () => {
    const filePath = path.join(tempDir, 'report.xlsx');
    fs.writeFileSync(filePath, 'ok', 'utf8');

    const output = safeFileExists(tempDir, 'report.xlsx', {
      allowedExtensions: ['.xlsx'],
    });

    expect(output.valid).toBe(true);
    expect(output.path).toBe(path.resolve(filePath));
    expect(output.error).toBeNull();
  });

  test('safeFileExists returns not found for missing file', () => {
    const output = safeFileExists(tempDir, 'missing.xlsx', {
      allowedExtensions: ['.xlsx'],
    });

    expect(output.valid).toBe(false);
    expect(output.error).toBe('File not found');
  });

  test('safeDirExists validates existing directory', () => {
    const reportsDir = path.join(tempDir, 'reports');
    fs.mkdirSync(reportsDir);

    const output = safeDirExists(tempDir, 'reports');

    expect(output.valid).toBe(true);
    expect(output.path).toBe(path.resolve(reportsDir));
    expect(output.error).toBeNull();
  });
});
