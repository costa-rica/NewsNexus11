import bcrypt from "bcrypt";
import { mkdir } from "node:fs/promises";
import { EntityWhoFoundArticle, User } from "@newsnexus/db-models";
import logger from "./logger";

function parseAdminEmails(rawValue: string | undefined): string[] {
  if (!rawValue || rawValue.trim() === "") {
    logger.warn("No admin emails found in ADMIN_EMAIL_CREATE_ON_STARTUP.");
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("ADMIN_EMAIL_CREATE_ON_STARTUP must be a JSON array.");
    }

    return parsed
      .map((email) => String(email).trim())
      .filter((email) => email.length > 0);
  } catch (error) {
    logger.error(
      "Error parsing ADMIN_EMAIL_CREATE_ON_STARTUP. Ensure it is a JSON array string.",
      error,
    );
    return [];
  }
}

export async function onStartUpCreateEnvUsers(): Promise<void> {
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAIL_CREATE_ON_STARTUP);
  if (adminEmails.length === 0) {
    return;
  }

  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "test";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  for (const email of adminEmails) {
    try {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        logger.info(`Startup admin user already exists: ${email}`);
        continue;
      }

      logger.info(`Startup creating admin user: ${email}`);
      const newUser = await User.create({
        username: email.split("@")[0] || email,
        email,
        password: hashedPassword,
        isAdmin: true,
      });

      await EntityWhoFoundArticle.create({
        userId: newUser.id,
      });

      logger.info(`Startup admin user created: ${email}`);
    } catch (error) {
      logger.error(`Startup failed creating admin user (${email})`, error);
    }
  }
}

export async function verifyCheckDirectoryExists(): Promise<void> {
  const pathsToCheck = [
    process.env.PATH_TO_API_RESPONSE_JSON_FILES,
    process.env.PATH_PROJECT_RESOURCES_REPORTS,
    process.env.PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS,
    process.env.PATH_TO_AUTOMATION_EXCEL_FILES,
    process.env.PATH_TO_UTILITIES_DEDUPER,
  ]
    .map((dirPath) => (dirPath || "").trim())
    .filter((dirPath) => dirPath.length > 0);

  for (const dirPath of pathsToCheck) {
    await mkdir(dirPath, { recursive: true });
    logger.info(`Startup verified directory: ${dirPath}`);
  }
}

export async function runOnStartUp(): Promise<void> {
  await verifyCheckDirectoryExists();
  await onStartUpCreateEnvUsers();
}

