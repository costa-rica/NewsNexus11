jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import {
  sanitizeValue,
  sanitizeFilename,
  deepSanitize,
  globalSecurityMiddleware,
} from '../../src/middleware/globalSecurity';

describe('globalSecurity middleware', () => {
  test('sanitizeValue removes script tags and traversal sequences', () => {
    const input = '<script>alert(1)</script>..\\..\/safe javascript:alert(1)';
    const output = sanitizeValue(input);

    expect(output).not.toContain('<script>');
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('../');
    expect(output).not.toContain('..\\');
  });

  test('sanitizeFilename strips separators and traversal markers', () => {
    const output = sanitizeFilename('../dangerous\\name.xlsx');
    expect(output).toBe('dangerousname.xlsx');
  });

  test('deepSanitize removes prototype pollution keys', () => {
    const input = {
      safe: 'ok',
      nested: {
        value: 'test',
      },
      __proto__: 'blocked',
      constructor: 'blocked',
      prototype: 'blocked',
    } as Record<string, unknown>;

    const output = deepSanitize(input as any) as Record<string, unknown>;

    expect(output.safe).toBe('ok');
    expect(output.nested).toEqual({ value: 'test' });
    expect(Object.prototype.hasOwnProperty.call(output, '__proto__')).toBe(
      false
    );
    expect(Object.prototype.hasOwnProperty.call(output, 'constructor')).toBe(
      false
    );
    expect(Object.prototype.hasOwnProperty.call(output, 'prototype')).toBe(
      false
    );
  });

  test('globalSecurityMiddleware sanitizes params, query, and body', () => {
    const req = {
      params: {
        id: '../123',
      },
      query: {
        q: '<script>abc</script>hello',
      },
      body: {
        note: 'javascript:alert(1)',
      },
    } as any;

    const res = {} as any;
    const next = jest.fn();

    globalSecurityMiddleware(req, res, next);

    expect(req.params.id).toBe('123');
    expect(req.query.q).toBe('hello');
    expect(req.body.note).toBe('alert(1)');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
