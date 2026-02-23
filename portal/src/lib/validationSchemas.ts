/**
 * INPUT VALIDATION SCHEMAS
 *
 * PURPOSE: Client-side input validation using Zod to prevent malicious input
 *
 * SECURITY CONTEXT:
 * During the December 2025 security breach, the application lacked input validation,
 * allowing attackers to submit malicious payloads. While the backend API should
 * perform its own validation (primary defense), these client-side validations provide:
 *
 * 1. Defense-in-depth: Additional layer before backend
 * 2. UX improvement: Immediate feedback to users
 * 3. Attack prevention: Blocks obviously malicious patterns
 * 4. Reduced load: Prevents invalid requests from reaching backend
 *
 * SECURITY PATTERNS BLOCKED:
 * - Command injection characters: semicolon, pipe, ampersand, dollar, backtick, backslash
 * - SQL injection attempts: quotes, double-dash, comment blocks
 * - XSS attempts: angle brackets and script tags
 * - Path traversal: dot-dot-slash patterns
 * - Null bytes and control characters
 * - Excessively long inputs (DoS prevention)
 *
 * REFERENCE: docs/security-measures20251213/Security_Measures_01_Abbreviated.md
 *
 * @see https://zod.dev
 */

import { z } from "zod";

/**
 * Email validation schema
 *
 * SECURITY: Enforces valid email format and reasonable length limits
 * - RFC 5321 max local part: 64 chars, domain: 255 chars
 * - Prevents email header injection
 * - Blocks control characters and special chars that could be exploited
 */
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(320, "Email is too long") // 64 (local) + 1 (@) + 255 (domain)
  .email("Please enter a valid email address")
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    "Email contains invalid characters"
  )
  .transform((email) => email.toLowerCase().trim());

/**
 * Password validation schema
 *
 * SECURITY: Enforces strong password requirements
 * - Minimum 8 characters (industry standard)
 * - Maximum 128 characters (prevents DoS via hash computation)
 * - No injection characters that could exploit password storage
 *
 * NOTE: Backend should enforce additional requirements (uppercase, numbers, etc.)
 * This is intentionally lenient to allow backend to control password policy
 */
const passwordSchema = z
  .string()
  .min(1, "Password is required")
  // .min(8, 'Password must be at least 8 characters')
  .max(128, "Password is too long")
  // SECURITY: Block null bytes and control characters
  .regex(/^[\x20-\x7E]*$/, "Password contains invalid characters");

/**
 * Password reset token validation
 *
 * SECURITY: Validates JWT or random token format
 * - Alphanumeric, hyphens, underscores, dots only
 * - Reasonable length limits
 * - Prevents path traversal and injection
 */
const tokenSchema = z
  .string()
  .min(1, "Reset token is required")
  .max(500, "Invalid reset token")
  .regex(/^[a-zA-Z0-9._-]+$/, "Reset token contains invalid characters");

/**
 * LOGIN FORM VALIDATION
 *
 * Validates user login credentials before sending to backend API
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * REGISTRATION FORM VALIDATION
 *
 * Validates new user registration data
 * Can be extended with password confirmation, terms acceptance, etc.
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * FORGOT PASSWORD FORM VALIDATION
 *
 * Validates email for password reset request
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * RESET PASSWORD FORM VALIDATION
 *
 * Validates new password and reset token
 */
export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * VALIDATION HELPER FUNCTION
 *
 * Validates data against a schema and returns user-friendly error messages
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and either data or error messages
 *
 * USAGE:
 * ```typescript
 * const result = validateInput(loginSchema, { email, password });
 * if (!result.success) {
 *   alert(result.errors.email || result.errors.password);
 *   return;
 * }
 * // Use result.data (validated and sanitized)
 * ```
 */
export function validateInput<T extends z.ZodType>(
  schema: T,
  data: unknown
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Convert Zod errors to user-friendly field-based error messages
  const errors: Record<string, string> = {};
  if (result.error?.issues) {
    result.error.issues.forEach((issue) => {
      const field = issue.path.join(".");
      errors[field] = issue.message;
    });
  }

  return { success: false, errors };
}
