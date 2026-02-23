/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from:
 * - Brute force attacks on authentication
 * - Account enumeration
 * - Denial of Service (DoS)
 * - API abuse and resource exhaustion
 *
 * Uses IP-based rate limiting with different configurations for different endpoint types.
 *
 * Usage:
 *   const { loginLimiter, generalLimiter } = require('../middleware/rateLimiting');
 *   router.post('/login', loginLimiter, handler);
 */

import rateLimit from "express-rate-limit";
import logger from "../modules/logger";

/**
 * Global API rate limiter
 * Applied to all routes to prevent general abuse
 *
 * Limit: 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    result: false,
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Don't count successful requests against the limit for most endpoints
  skipSuccessfulRequests: false,
  // Handler called when rate limit is exceeded
  handler: (req, res) => {
    logger.warn(`[RATE LIMIT] Global limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      result: false,
      error: "Too many requests, please try again later.",
    });
  },
});

/**
 * Strict login rate limiter
 * Prevents brute force password attacks
 *
 * Limit: 5 attempts per 15 minutes per IP
 * Failed attempts count, successful logins don't count
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    result: false,
    error:
      "Too many login attempts from this IP, please try again after 15 minutes.",
    retryAfter: "15 minutes",
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    logger.warn(
      `[RATE LIMIT] Login attempts exceeded for IP: ${req.ip}, Email: ${
        req.body?.email || "unknown"
      }`
    );
    res.status(429).json({
      result: false,
      error: "Too many login attempts. Please try again later.",
    });
  },
});

/**
 * Registration rate limiter
 * Prevents mass account creation
 *
 * Limit: 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: {
    result: false,
    error:
      "Too many accounts created from this IP, please try again after an hour.",
    retryAfter: "1 hour",
  },
  handler: (req, res) => {
    logger.warn(`[RATE LIMIT] Registration limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      result: false,
      error: "Too many accounts created from this IP. Please try again later.",
    });
  },
});

/**
 * Password reset request limiter
 * Prevents email bombing and abuse
 *
 * Limit: 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    result: false,
    error:
      "Too many password reset requests from this IP, please try again after an hour.",
    retryAfter: "1 hour",
  },
  handler: (req, res) => {
    logger.warn(
      `[RATE LIMIT] Password reset limit exceeded for IP: ${req.ip}, Email: ${
        req.body?.email || "unknown"
      }`
    );
    res.status(429).json({
      result: false,
      error: "Too many password reset requests. Please try again later.",
    });
  },
});

/**
 * Database operation rate limiter
 * Protects expensive database operations
 *
 * Limit: 20 requests per minute per IP
 * Use for admin endpoints and resource-intensive queries
 */
export const databaseOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    result: false,
    error: "Too many database requests, please slow down.",
    retryAfter: "1 minute",
  },
  handler: (req, res) => {
    logger.warn(
      `[RATE LIMIT] Database operation limit exceeded for IP: ${req.ip}, Path: ${req.path}`
    );
    res.status(429).json({
      result: false,
      error: "Too many requests. Please wait a moment and try again.",
    });
  },
});

/**
 * File operation rate limiter
 * Protects file upload/download endpoints
 *
 * Limit: 30 requests per minute per IP
 */
export const fileOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 file operations per minute
  message: {
    result: false,
    error: "Too many file operations, please slow down.",
    retryAfter: "1 minute",
  },
  handler: (req, res) => {
    logger.warn(
      `[RATE LIMIT] File operation limit exceeded for IP: ${req.ip}, Path: ${req.path}`
    );
    res.status(429).json({
      result: false,
      error: "Too many file requests. Please wait a moment and try again.",
    });
  },
});

/**
 * General API limiter (less strict than global)
 * For general endpoints that don't need strict limiting
 *
 * Limit: 200 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes
  message: {
    result: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
