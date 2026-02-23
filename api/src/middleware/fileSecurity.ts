/**
 * File Security Middleware - Safe File Path Handling
 *
 * Prevents path traversal attacks in file operations by:
 * - Validating filenames contain only safe characters
 * - Checking file extensions against allowlist
 * - Ensuring resolved paths stay within allowed directories
 * - Preventing null byte injection
 *
 * Usage in file download endpoints:
 *   const { safeFileExists } = require('../middleware/fileSecurity');
 *   const { valid, path: safePath, error } = safeFileExists(baseDir, filename);
 *   if (!valid) return res.status(404).json({ error });
 *   res.download(safePath);
 */

import fs from "fs";
import path from "path";
import logger from "../modules/logger";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type FileSecurityOptions = {
  allowedExtensions?: string[];
  maxFilenameLength?: number;
};

/**
 * Safely resolve and validate a file path
 *
 * @param {string} baseDirectory - The allowed base directory (must be absolute)
 * @param {string} filename - The filename from user input
 * @param {object} options - Configuration options
 * @param {string[]=} options.allowedExtensions - Array of allowed file extensions (default: ['.xlsx', '.xls', '.zip', '.pdf'])
 * @param {number=} options.maxFilenameLength - Maximum filename length (default: 255)
 * @returns {string|null} - Safe absolute path or null if invalid
 */
export function safeFilePath(
  baseDirectory: string,
  filename: string,
  options: FileSecurityOptions = {}
) {
  const {
    allowedExtensions = [".xlsx", ".xls", ".zip", ".pdf"],
    maxFilenameLength = 255,
  } = options;

  // Validate inputs
  if (!baseDirectory || typeof baseDirectory !== "string") {
    logger.warn("[FILE SECURITY] Invalid base directory");
    return null;
  }

  if (!filename || typeof filename !== "string") {
    logger.warn("[FILE SECURITY] Invalid filename");
    return null;
  }

  // Check filename length
  if (filename.length > maxFilenameLength) {
    logger.warn(`[FILE SECURITY] Filename too long: ${filename.length} chars`);
    return null;
  }

  // Remove any path components - use only the basename
  // This prevents path traversal like "../../../etc/passwd"
  const sanitizedFilename = path.basename(filename);

  // Validate characters - only allow alphanumeric, dash, underscore, dot, space
  // This is stricter than necessary but safe
  if (!/^[a-zA-Z0-9_\-\.\s]+$/.test(sanitizedFilename)) {
    logger.warn(
      `[FILE SECURITY] Invalid characters in filename: ${sanitizedFilename}`
    );
    return null;
  }

  // Validate file extension
  const ext = path.extname(sanitizedFilename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    logger.warn(`[FILE SECURITY] Disallowed file extension: ${ext}`);
    return null;
  }

  // Prevent hidden files (starting with .)
  if (sanitizedFilename.startsWith(".")) {
    logger.warn(
      `[FILE SECURITY] Hidden files not allowed: ${sanitizedFilename}`
    );
    return null;
  }

  // Construct the full path
  const fullPath = path.join(baseDirectory, sanitizedFilename);

  // Resolve to absolute path (removes .., ., symlinks)
  const resolvedPath = path.resolve(fullPath);
  const resolvedBase = path.resolve(baseDirectory);

  // CRITICAL: Verify the resolved path is still within the base directory
  // This prevents path traversal even if symlinks or other tricks are used
  if (
    !resolvedPath.startsWith(resolvedBase + path.sep) &&
    resolvedPath !== resolvedBase
  ) {
    logger.warn(`[FILE SECURITY] Path traversal attempt detected!`);
    logger.warn(`  Requested: ${filename}`);
    logger.warn(`  Resolved:  ${resolvedPath}`);
    logger.warn(`  Base:      ${resolvedBase}`);
    return null;
  }

  return resolvedPath;
}

/**
 * Safely validate a file exists and return its path
 *
 * @param {string} baseDirectory - The allowed base directory
 * @param {string} filename - The filename from user input
 * @param {object} options - Configuration options (same as safeFilePath)
 * @returns {object} - { valid: boolean, path: string|null, error: string|null }
 */
export function safeFileExists(
  baseDirectory: string,
  filename: string,
  options: FileSecurityOptions = {}
) {
  // First, get the safe path
  const safePath = safeFilePath(baseDirectory, filename, options);

  if (!safePath) {
    return {
      valid: false,
      path: null,
      error: "Invalid filename or path traversal attempt detected",
    };
  }

  // Check if file exists
  try {
    if (!fs.existsSync(safePath)) {
      return {
        valid: false,
        path: safePath,
        error: "File not found",
      };
    }

    // Verify it's a file, not a directory
    const stats = fs.statSync(safePath);
    if (!stats.isFile()) {
      return {
        valid: false,
        path: safePath,
        error: "Path is not a file",
      };
    }

    // All checks passed
    return {
      valid: true,
      path: safePath,
      error: null,
    };
  } catch (error) {
    logger.error("[FILE SECURITY] Error checking file:", getErrorMessage(error));
    return {
      valid: false,
      path: safePath,
      error: "Error accessing file",
    };
  }
}

/**
 * Safely validate a directory exists and return its path
 *
 * @param {string} baseDirectory - The allowed base directory
 * @param {string} dirName - The directory name from user input
 * @returns {object} - { valid: boolean, path: string|null, error: string|null }
 */
export function safeDirExists(baseDirectory: string, dirName: string) {
  if (!dirName || typeof dirName !== "string") {
    return {
      valid: false,
      path: null,
      error: "Invalid directory name",
    };
  }

  // Use basename to prevent path traversal
  const sanitizedDirName = path.basename(dirName);

  // Validate characters
  if (!/^[a-zA-Z0-9_\-\.\s]+$/.test(sanitizedDirName)) {
    return {
      valid: false,
      path: null,
      error: "Invalid characters in directory name",
    };
  }

  const fullPath = path.join(baseDirectory, sanitizedDirName);
  const resolvedPath = path.resolve(fullPath);
  const resolvedBase = path.resolve(baseDirectory);

  // Verify within base directory
  if (
    !resolvedPath.startsWith(resolvedBase + path.sep) &&
    resolvedPath !== resolvedBase
  ) {
    logger.warn(`[FILE SECURITY] Directory path traversal attempt: ${dirName}`);
    return {
      valid: false,
      path: null,
      error: "Invalid directory path",
    };
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return {
        valid: false,
        path: resolvedPath,
        error: "Directory not found",
      };
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        path: resolvedPath,
        error: "Path is not a directory",
      };
    }

    return {
      valid: true,
      path: resolvedPath,
      error: null,
    };
  } catch (error) {
    logger.error("[FILE SECURITY] Error checking directory:", getErrorMessage(error));
    return {
      valid: false,
      path: resolvedPath,
      error: "Error accessing directory",
    };
  }
}
