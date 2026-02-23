import csvParser from 'csv-parser';
import fs from 'fs';
import path from 'path';
// const sequelize = require("../models/_connection"); // Import Sequelize instance
import logger from './logger';

// Import models directly
const {
  sequelize,
  User,
  ArticleKeywordContract,
  EntityWhoCategorizedArticle,
  ArtificialIntelligence,
  State,
  ArticleStateContract,
  Report,
  ArticleReportContract,
  ArticleReviewed,
  ArticleApproved,
  ArticleDuplicateAnalysis,
  NewsApiRequest,
  ArticleContent,
  NewsRssRequest,
  Keyword,
  NewsArticleAggregatorSource,
  Article,
  EntityWhoFoundArticle,
  NewsArticleAggregatorSourceStateContract,
  ArticleIsRelevant,
  NewsApiRequestWebsiteDomainContract,
  WebsiteDomain,
  ArticleEntityWhoCategorizedArticleContract,
  ArticleEntityWhoCategorizedArticleContracts02,
  ArticlesApproved02,
  ArticleStateContract02,
  Prompt,
} = require("newsnexus10db");

import { promisify } from 'util';
import archiver from 'archiver';
import { Parser } from 'json2csv';
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);

const models: Record<string, any> = {
  User,
  ArticleKeywordContract,
  EntityWhoCategorizedArticle,
  ArtificialIntelligence,
  State,
  ArticleStateContract,
  Report,
  ArticleReportContract,
  ArticleReviewed,
  ArticleApproved,
  ArticleDuplicateAnalysis,
  NewsApiRequest,
  ArticleContent,
  NewsRssRequest,
  Keyword,
  NewsArticleAggregatorSource,
  Article,
  EntityWhoFoundArticle,
  NewsArticleAggregatorSourceStateContract,
  ArticleIsRelevant,
  NewsApiRequestWebsiteDomainContract,
  WebsiteDomain,
  ArticleEntityWhoCategorizedArticleContract,
  ArticleEntityWhoCategorizedArticleContracts02,
  ArticlesApproved02,
  ArticleStateContract02,
  Prompt,
};

function coerceCsvValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null') return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num)) return num;
  }

  return value;
}

function coerceCsvRow(row: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    output[key] = coerceCsvValue(value);
  }
  return output;
}

async function readAndAppendDbTables(backupFolderPath: string) {
  logger.info(`Processing CSV files from: ${backupFolderPath}`);
  logger.info(`Sequelize instance: ${sequelize}`);
  let currentTable: string | null = null;
  try {
    // Read all CSV files from the backup directory
    const csvFiles = await fs.promises.readdir(backupFolderPath);
    let totalRecordsImported = 0;

    // Separate CSV files into four append batches
    const appendBatch1: string[] = [];

    csvFiles.forEach((file) => {
      if (!file.endsWith(".csv")) return; // Skip non-CSV files
      appendBatch1.push(file);
    });

    logger.info(`Append Batch 1 (First): ${appendBatch1}`);

    // Helper function to process CSV files
    async function processCSVFiles(files: string[]) {
      let recordsImported = 0;

      for (const file of files) {
        const tableName = file.replace(".csv", "");
        if (!models[tableName]) {
          logger.info(`Skipping ${file}, no matching table found.`);
          continue;
        }

        logger.info(`Importing data into table: ${tableName}`);
        currentTable = tableName;
        const filePath = path.join(backupFolderPath, file);
        const records: Record<string, any>[] = [];

        // Read CSV file
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row: Record<string, any>) => records.push(coerceCsvRow(row)))
            // .on("data", (row) => {
            //   if (file === "Keyword.csv" && "isArchived" in row) {
            //     convertIsArchivedNotOneToFalse(row);
            //   }
            //   records.push(row);
            // })
            .on("end", resolve)
            .on("error", reject);
        });

        if (records.length > 0) {
          await models[tableName].bulkCreate(records, {
            ignoreDuplicates: true,
          });
          recordsImported += records.length;
          logger.info(`Imported ${records.length} records into ${tableName}`);
        } else {
          logger.info(`No records found in ${file}`);
        }
      }

      return recordsImported;
    }

    // 🔹 Disable foreign key constraints before importing
    // ↪This allows us to append when necessary foreign keys are not yet populated.
    logger.info("Disabling foreign key constraints...");
    await sequelize.query("PRAGMA foreign_keys = OFF;");

    // Process the batches in order
    totalRecordsImported += await processCSVFiles(appendBatch1); // First batch

    // 🔹 Re-enable foreign key constraints after importing
    logger.info("Re-enabling foreign key constraints...");
    await sequelize.query("PRAGMA foreign_keys = ON;");

    return {
      success: true,
      message: `Successfully imported ${totalRecordsImported} records.`,
    };
  } catch (error: any) {
    logger.error("Error processing CSV files:", error);

    // Ensure foreign key constraints are re-enabled even if an error occurs
    await sequelize.query("PRAGMA foreign_keys = ON;");

    return {
      success: false,
      error: error.message,
      failedOnTableName: currentTable,
    };
  }
}

async function createDatabaseBackupZipFile(suffix = ""): Promise<string> {
  logger.info(`suffix: ${suffix}`);
  try {
    const backupsDir = process.env.PATH_DB_BACKUPS;
    if (!backupsDir) {
      throw new Error("PATH_DB_BACKUPS is not configured");
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 15);

    const backupDir = path.join(
      backupsDir,
      `db_backup_${timestamp}${suffix}`
    );
    logger.info(`Backup directory: ${backupDir}`);
    await mkdirAsync(backupDir, { recursive: true });

    let hasData = false;

    for (const tableName in models) {
      if (models.hasOwnProperty(tableName)) {
        const records = await models[tableName].findAll({ raw: true });
        if (records.length === 0) continue;

        const json2csvParser = new Parser();
        const csvData = json2csvParser.parse(records);

        const filePath = path.join(backupDir, `${tableName}.csv`);
        await writeFileAsync(filePath, csvData);
        hasData = true;
      }
    }

    if (!hasData) {
      await fs.promises.rmdir(backupDir, { recursive: true });
      throw new Error("No data found in any tables. Backup skipped.");
    }

    const zipFileName = `db_backup_${timestamp}${suffix}.zip`;
    const zipFilePath = path.join(backupsDir, zipFileName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", () => resolve(zipFilePath));
      archive.on("error", reject);
      archive.pipe(output);
      archive.directory(backupDir, false);
      archive.finalize().then(() => {
        fs.promises.rmdir(backupDir, { recursive: true });
      });
    });
  } catch (error: any) {
    logger.error("Error creating database backup:", error);
    throw error;
  }
}

function convertIsArchivedNotOneToFalse(row: Record<string, any>) {
  if (row["isArchived"] !== "1") {
    row["isArchived"] = false;
  } else if (typeof row["isArchived"] === "string") {
    row["isArchived"] = row["isArchived"].toLowerCase() === "true";
  }
}

export {
  readAndAppendDbTables,
  createDatabaseBackupZipFile,
};
