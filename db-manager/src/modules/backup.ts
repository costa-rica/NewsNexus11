import archiver from "archiver";
import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import * as db from "@newsnexus/db-models";
import { logger } from "../config/logger";

type ModelRegistry = Record<string, { findAll: Function }>;

function getModelRegistry(): ModelRegistry {
  const registry: ModelRegistry = {};

  for (const [name, value] of Object.entries(db)) {
    if (value && typeof (value as { findAll?: Function }).findAll === "function") {
      registry[name] = value as { findAll: Function };
    }
  }

  return registry;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 15);
}

export async function createDatabaseBackupZipFile(): Promise<string> {
  const backupRoot = process.env.PATH_DB_BACKUPS;

  if (!backupRoot) {
    throw new Error("PATH_DB_BACKUPS is required to create backups");
  }

  const timestamp = getTimestamp();
  const backupDir = path.join(backupRoot, `db_backup_${timestamp}`);
  const zipFilePath = path.join(backupRoot, `db_backup_${timestamp}.zip`);

  logger.info(`Backup directory: ${backupDir}`);
  await fs.promises.mkdir(backupDir, { recursive: true });

  const registry = getModelRegistry();
  let hasData = false;

  try {
    for (const tableName of Object.keys(registry)) {
      const records = await registry[tableName].findAll({ raw: true });
      if (!records || records.length === 0) {
        continue;
      }

      const json2csvParser = new Parser();
      const csvData = json2csvParser.parse(records);
      const filePath = path.join(backupDir, `${tableName}.csv`);
      await fs.promises.writeFile(filePath, csvData);
      hasData = true;
    }

    if (!hasData) {
      await fs.promises.rm(backupDir, { recursive: true, force: true });
      throw new Error("No data found in any tables. Backup skipped.");
    }

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => resolve());
      archive.on("error", (error: Error) => reject(error));

      archive.pipe(output);
      archive.directory(backupDir, false);
      archive.finalize();
    });

    await fs.promises.rm(backupDir, { recursive: true, force: true });
    logger.info(`Backup created: ${zipFilePath}`);
    return zipFilePath;
  } catch (error) {
    logger.error("Error creating database backup", { error });
    throw error;
  }
}
