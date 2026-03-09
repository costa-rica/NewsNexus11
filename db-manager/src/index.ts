import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { QueryTypes } from "sequelize";
import { DEFAULT_DELETE_DAYS, parseCliArgs } from "./modules/cli";
import { DatabaseStatus } from "./types/status";

dotenv.config();

const { logger } = require("./config/logger") as typeof import("./config/logger");
const { initModels, sequelize } = require("@newsnexus/db-models") as typeof import("@newsnexus/db-models");

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStatus(status: DatabaseStatus): void {
  const numberFormatter = new Intl.NumberFormat("en-US");
  const formatCount = (value: number) => numberFormatter.format(value);
  logger.info("Database status summary:");
  logger.info(`- Total articles: ${formatCount(status.totalArticles)}`);
  logger.info(
    `- Articles marked not relevant: ${formatCount(status.irrelevantArticles)}`,
  );
  logger.info(`- Articles approved: ${formatCount(status.approvedArticles)}`);
  logger.info(
    `- Articles older than ${status.cutoffDate}: ${formatCount(status.oldArticles)}`,
  );
  logger.info(
    `- Articles older than ${status.cutoffDate} and eligible for deletion: ${formatCount(status.deletableOldArticles)}`,
  );
}

async function ensureDatabaseExists(): Promise<void> {
  const dbDir = process.env.PATH_DATABASE;
  const dbName = process.env.NAME_DB;

  if (!dbDir || !dbName) {
    throw new Error("Missing PATH_DATABASE or NAME_DB environment variables");
  }

  const dbPath = path.join(dbDir, dbName);

  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`🆕 Database not found. Creating new database at ${dbPath}`);
    await sequelize.sync();
  }
}

async function databaseHasData(): Promise<boolean> {
  const tables = await sequelize.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
    { type: QueryTypes.SELECT },
  );

  for (const { name } of tables) {
    const rows = await sequelize.query(
      `SELECT 1 FROM "${name}" LIMIT 1;`,
      { type: QueryTypes.SELECT },
    );
    if (rows.length > 0) {
      return true;
    }
  }

  return false;
}

(async () => {
  try {
    const options = parseCliArgs(process.argv.slice(2));

    initModels();
    await ensureDatabaseExists();

    const { getDatabaseStatus } = await import("./modules/status");
    const {
      deleteOldUnapprovedArticles,
      deleteOldestEligibleArticles,
    } = await import("./modules/deleteArticles");
    const { createDatabaseBackupZipFile } = await import("./modules/backup");
    const { importZipFileToDatabase } = await import("./modules/zipImport");

    if (options.createBackup) {
      logger.info("Creating database backup zip file");
      const backupPath = await createDatabaseBackupZipFile();
      logger.info(`Backup created at: ${backupPath}`);
    }

    if (options.zipFilePath) {
      const hasData = await databaseHasData();
      if (hasData) {
        logger.warn(
          "Zip import skipped because the database already contains data. Displaying status only.",
        );
      } else {
        logger.info(
          `Importing database updates from zip: ${options.zipFilePath}`,
        );
        const result = await importZipFileToDatabase(options.zipFilePath);
        logger.info(
          `Imported ${result.totalRecords} records across ${result.importedTables.length} tables`,
        );
        if (result.skippedFiles.length > 0) {
          logger.warn(
            `Skipped files with no matching model: ${result.skippedFiles.join(", ")}`,
          );
        }
      }
    }

    if (options.deleteArticlesTrimCount !== undefined) {
      logger.info(
        `Trimming ${options.deleteArticlesTrimCount} oldest eligible articles without relevance or approval`,
      );
      const result = await deleteOldestEligibleArticles(
        options.deleteArticlesTrimCount,
      );
      logger.info(
        `Trimmed ${result.deletedCount} of ${result.foundCount} eligible articles (requested ${result.requestedCount}).`,
      );
    }

    if (options.deleteArticlesDays !== undefined) {
      const days = options.deleteArticlesDays ?? DEFAULT_DELETE_DAYS;
      logger.info(
        `Deleting articles older than ${days} days without relevance or approval`,
      );
      const result = await deleteOldUnapprovedArticles(days);
      logger.info(
        `Deleted ${result.deletedCount} articles older than ${result.cutoffDate}`,
      );
    }

    const status = await getDatabaseStatus();
    logStatus(status);

    await sequelize.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Fatal error: ${message}`, { error });
    console.error(message);
    await delay(100);
    process.exit(1);
  }
})();
