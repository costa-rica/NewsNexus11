/**
 * Global Security Middleware - Sanitization Only
 *
 * This middleware sanitizes all incoming request data to prevent security attacks.
 * It does NOT enforce validation rules (like password length, email format, etc.)
 *
 * Protects against:
 * - Path traversal attacks (../, ..\, null bytes)
 * - XSS attacks (script tags, event handlers)
 * - Prototype pollution (__proto__, constructor)
 * - Null byte injection
 *
 * Usage in server.js:
 *   const { globalSecurityMiddleware } = require('./middleware/globalSecurity');
 *   app.use(globalSecurityMiddleware);
 */
import logger from "../modules/logger";
import type { NextFunction, Request, Response } from "express";

type SanitizableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SanitizableValue[]
  | { [key: string]: SanitizableValue };
/**
 * Main middleware function - automatically sanitizes all request data
 */
export function globalSecurityMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Sanitize URL parameters (e.g., /users/:id, /articles/:articleId)
  if (req.params && typeof req.params === "object") {
    for (const [key, value] of Object.entries(req.params)) {
      (req.params as any)[key] = sanitizeValue(value);
    }
  }

  // Sanitize query parameters (e.g., ?search=something&page=1)
  if (req.query && typeof req.query === "object") {
    req.query = deepSanitize(req.query as unknown as SanitizableValue) as any;
  }

  // Sanitize request body (POST/PUT/PATCH data)
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }

  next();
}

/**
 * Recursively sanitize nested objects and arrays
 */
export function deepSanitize(obj: SanitizableValue): SanitizableValue {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item));
  }

  // Handle objects
  if (typeof obj === "object") {
    const sanitized: Record<string, SanitizableValue> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Prevent prototype pollution - skip dangerous keys
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        logger.warn(
          `[SECURITY] Blocked prototype pollution attempt with key: ${key}`
        );
        continue;
      }

      // Recursively sanitize nested values
      sanitized[key] = deepSanitize(value);
    }

    return sanitized;
  }

  // Handle strings, numbers, booleans, etc.
  return sanitizeValue(obj);
}

/**
 * Sanitize individual values (strings primarily)
 */
export function sanitizeValue(value: SanitizableValue): SanitizableValue {
  // Only sanitize strings
  if (typeof value !== "string") {
    return value;
  }

  let sanitized = value;

  // 1. Remove null bytes (can bypass security checks)
  sanitized = sanitized.replace(/\0/g, "");

  // 2. Remove path traversal attempts in strings
  // Note: This is a general cleanup. File paths need additional validation.
  sanitized = sanitized.replace(/\.\.\//g, ""); // Remove ../
  sanitized = sanitized.replace(/\.\.\\/g, ""); // Remove ..\

  // 3. Basic XSS prevention - remove dangerous HTML/JS patterns
  // Note: This is NOT a complete XSS solution, but catches common attacks

  // Remove <script> tags (case insensitive)
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove common event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");

  // Remove <iframe> tags
  sanitized = sanitized.replace(
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ""
  );

  return sanitized;
}

/**
 * Sanitize filename specifically (more strict than general strings)
 * This is exported for use in file operation utilities
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") {
    return filename;
  }

  let sanitized = filename;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove ALL path separators (/, \)
  sanitized = sanitized.replace(/[\/\\]/g, "");

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, "");

  return sanitized;
}
