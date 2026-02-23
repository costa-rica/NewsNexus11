jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import {
  checkBody,
  checkBodyReturnMissing,
  convertJavaScriptDateToTimezoneString,
  convertDbUtcDateOrStringToEasternString,
} from '../../src/modules/common';

describe('common utility module', () => {
  test('checkBody returns true when all required fields are present', () => {
    const body = { email: 'user@example.com', password: 'secret' };
    expect(checkBody(body, ['email', 'password'])).toBe(true);
  });

  test('checkBodyReturnMissing returns missing keys', () => {
    const body = { email: 'user@example.com', password: '' };
    const result = checkBodyReturnMissing(body, ['email', 'password', 'name']);

    expect(result.isValid).toBe(false);
    expect(result.missingKeys).toEqual(['password', 'name']);
  });

  test('convertJavaScriptDateToTimezoneString adds dateString field', () => {
    const date = new Date('2025-06-10T12:00:00.000Z');
    const result = convertJavaScriptDateToTimezoneString(date, 'America/New_York');

    expect(result).toHaveProperty('dateString');
    expect(result.dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('convertDbUtcDateOrStringToEasternString handles string input', () => {
    const output = convertDbUtcDateOrStringToEasternString('2025-06-10T12:00:00.000Z');
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
