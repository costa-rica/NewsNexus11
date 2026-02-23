import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import archiver from "archiver";
import { Parser } from "json2csv";
import multer from "multer";
import unzipper from "unzipper";

const router = express.Router();
const {
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
} = require("@newsnexus/db-models");

const tableRegistry = {
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
} as const;
type TableName = keyof typeof tableRegistry;
type RequestWithUploadFile = Request & { file?: { path: string } };

function resolveTableModel(tableNameParam: string | string[] | undefined): {
  tableName: TableName;
  model: any;
} | null {
  const normalizedTableName = Array.isArray(tableNameParam)
    ? tableNameParam[0]
    : tableNameParam;
  if (!normalizedTableName) {
    return null;
  }

  if (!(normalizedTableName in tableRegistry)) {
    return null;
  }

  const tableName = normalizedTableName as TableName;
  return {
    tableName,
    model: tableRegistry[tableName],
  };
}

const { safeFileExists } = require("../middleware/fileSecurity");
const { databaseOperationLimiter } = require("../middleware/rateLimiting");
// Promisify fs functions
const mkdirAsync = promisify(fs.mkdir);
const { authenticateToken } = require("../modules/userAuthentication");
const unlinkAsync = promisify(fs.unlink);
const {
  readAndAppendDbTables,
  createDatabaseBackupZipFile,
} = require("../modules/adminDb");

// upload data to database
if (!process.env.PATH_PROJECT_RESOURCES) {
  throw new Error(
    "Missing required environment variable: PATH_PROJECT_RESOURCES",
  );
}
const uploadTempDir = path.join(
  process.env.PATH_PROJECT_RESOURCES,
  "uploads-delete-ok",
);
if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}
const upload = multer({
  dest: uploadTempDir,
}); // Temporary storage for file uploads
const logger = require("../modules/logger");

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

router.get(
  "/table/:tableName",
  authenticateToken,
  databaseOperationLimiter,
  async (req: RequestWithUploadFile, res: Response) => {
    try {
      const resolved = resolveTableModel(req.params.tableName);
      if (!resolved) {
        const tableName = Array.isArray(req.params.tableName)
          ? req.params.tableName[0]
          : req.params.tableName;
        return res
          .status(400)
          .json({ result: false, message: `Table '${tableName}' not found.` });
      }
      const { tableName, model } = resolved;
      logger.info(`- in GET /admin-db/table/${tableName}`);

      // Fetch all records from the table
      const tableData = (await model.findAll()) || [];
      // logger.info(`Fetched data from ${tableName}:`, tableData);

      res.json({ result: true, data: tableData });
    } catch (error) {
      logger.error("Error fetching table data:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

router.get(
  "/create-database-backup",
  authenticateToken,
  databaseOperationLimiter,
  async (_req: Request, res: Response) => {
    logger.info(`- in GET /admin-db/create-database-backup`);

    try {
      const zipFilePath = await createDatabaseBackupZipFile();
      logger.info(`Backup zip created: ${zipFilePath}`);

      res.json({
        result: true,
        message: "Database backup completed",
        backupFile: zipFilePath,
      });
    } catch (error) {
      logger.error("Error creating database backup:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

// 🔹 Get Database Backup List (GET /admin-db/backup-database-list)
router.get(
  "/backup-database-list",
  authenticateToken,
  async (_req: Request, res: Response) => {
    logger.info(`- in GET /admin-db/backup-database-list`);

    try {
      const backupDir = process.env.PATH_DB_BACKUPS;
      if (!backupDir) {
        return res
          .status(500)
          .json({ result: false, message: "Backup directory not configured." });
      }

      // Read files in the backup directory
      const files = await fs.promises.readdir(backupDir);

      // Filter only .zip files
      const zipFiles = files.filter((file) => file.endsWith(".zip"));

      // logger.info(`Found ${zipFiles.length} backup files.`);

      res.json({ result: true, backups: zipFiles });
    } catch (error) {
      logger.error("Error retrieving backup list:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

router.get(
  "/send-db-backup/:filename",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info(`- in GET /admin-db/send-db-backup/${req.params.filename}`);

    try {
      const { filename } = req.params;
      const backupDir = process.env.PATH_DB_BACKUPS;

      if (!backupDir) {
        return res
          .status(500)
          .json({ result: false, message: "Backup directory not configured." });
      }

      // 🔒 Secure file path validation (prevents path traversal)
      const {
        valid,
        path: safePath,
        error,
      } = safeFileExists(backupDir, filename, { allowedExtensions: [".zip"] });

      if (!valid) {
        return res
          .status(404)
          .json({ result: false, message: error || "File not found." });
      }

      logger.info(`Sending file: ${safePath}`);
      res.download(safePath, path.basename(safePath), (err) => {
        if (err) {
          logger.error("Error sending file:", err);
          if (!res.headersSent) {
            res
              .status(500)
              .json({ result: false, message: "Error sending file." });
          }
        }
      });
    } catch (error) {
      logger.error("Error processing request:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

router.get(
  "/db-row-counts-by-table",
  authenticateToken,
  async (_req: Request, res: Response) => {
    logger.info(`- in GET /admin-db/db-row-counts-by-table`);

    try {
      let arrayRowCountsByTable = [];

      for (const tableName in tableRegistry) {
        if (Object.prototype.hasOwnProperty.call(tableRegistry, tableName)) {
          logger.info(`Checking table: ${tableName}`);

          // Count rows in the table
          const rowCount = await tableRegistry[tableName as TableName].count();

          arrayRowCountsByTable.push({
            tableName,
            rowCount: rowCount || 0, // Ensure it's 0 if empty
          });
        }
      }

      // sort arrayRowCountsByTable by tableName
      arrayRowCountsByTable.sort((a, b) =>
        a.tableName.localeCompare(b.tableName),
      );
      // logger.info(`Database row counts by table:`, arrayRowCountsByTable);
      res.json({ result: true, arrayRowCountsByTable });
    } catch (error) {
      logger.error("Error retrieving database row counts:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);
// 🔹 POST /admin-db/import-db-backup: Replenish the database with data from a .zip
router.post(
  "/import-db-backup",
  authenticateToken,
  databaseOperationLimiter,
  upload.single("backupFile"),
  async (req: RequestWithUploadFile, res: Response) => {
    logger.info("- in POST /admin-db/import-db-backup");

    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ result: false, message: "No file uploaded." });
      }

      const backupDir = process.env.PATH_PROJECT_RESOURCES;
      if (!backupDir) {
        logger.info("*** no file ***");
        return res.status(500).json({
          result: false,
          message: "Temporary directory not configured.",
        });
      }

      const tempExtractPath = path.join(backupDir, "temp_db_import");

      // Ensure the temp_db_import folder is clean before extracting
      if (fs.existsSync(tempExtractPath)) {
        logger.info("Previous temp_db_import folder found. Deleting...");
        await fs.promises.rm(tempExtractPath, { recursive: true });
        logger.info("Old temp_db_import folder deleted.");
      }

      await mkdirAsync(tempExtractPath, { recursive: true });

      logger.info(`Extracting backup to: ${tempExtractPath}`);

      // Unzip the uploaded file
      await fs
        .createReadStream(req.file.path)
        .pipe(unzipper.Extract({ path: tempExtractPath }))
        .promise();

      logger.info("Backup extracted successfully.");

      // Read all subfolders inside tempExtractPath
      const extractedFolders = await fs.promises.readdir(tempExtractPath);

      // Find the correct folder that starts with "db_backup_"
      let backupFolder = extractedFolders.find(
        (folder) => folder.startsWith("db_backup_") && folder !== "__MACOSX",
      );

      // Determine the path where CSV files should be searched
      let backupFolderPath = backupFolder
        ? path.join(tempExtractPath, backupFolder)
        : tempExtractPath;

      logger.info(`Using backup folder: ${backupFolderPath}`);

      // Call the new function to read and append database tables
      const status = await readAndAppendDbTables(backupFolderPath);

      // Clean up temporary files
      await fs.promises.rm(tempExtractPath, { recursive: true });
      await fs.promises.unlink(req.file.path);
      // await fs.promises.rm(
      //   path.join(process.env.PATH_PROJECT_RESOURCES, "uploads/"),
      //   { recursive: true }
      // );
      logger.info("Temporary files deleted.");

      logger.info(status);
      if (status?.failedOnTableName) {
        res.status(500).json({
          result: false,
          error: status.error,
          failedOnTableName: status.failedOnTableName,
        });
      } else {
        res.json({
          result: status.success,
          message: status.message,
        });
      }
    } catch (error) {
      logger.error("Error importing database backup:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

router.delete(
  "/delete-db-backup/:filename",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info(
      `- in DELETE /admin-db/delete-db-backup/${req.params.filename}`,
    );

    try {
      const { filename } = req.params;
      const normalizedFilename = Array.isArray(filename)
        ? filename[0]
        : filename;
      const backupDir = process.env.PATH_DB_BACKUPS;

      if (!backupDir) {
        return res
          .status(500)
          .json({ result: false, message: "Backup directory not configured." });
      }

      const filePath = path.join(backupDir, normalizedFilename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ result: false, message: "File not found." });
      }

      // Delete the file
      await fs.promises.unlink(filePath);
      logger.info(`Deleted file: ${filePath}`);

      res.json({ result: true, message: "Backup file deleted successfully." });
    } catch (error) {
      logger.error("Error deleting backup file:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

// 🔹 DELETE route to remove the entire database
router.delete(
  "/the-entire-database",
  authenticateToken,
  async (_req: Request, res: Response) => {
    logger.info("- in DELETE /admin-db/the-entire-database");

    try {
      // Create a backup before deletion
      logger.info("Creating database backup before deletion...");
      const backupPath = await createDatabaseBackupZipFile(
        "_last_before_db_delete",
      );
      logger.info(`Backup created at: ${backupPath}`);

      // Get database path and name from environment variables
      const dbPath = process.env.PATH_DATABASE;
      const dbName = process.env.NAME_DB;
      if (!dbPath || !dbName) {
        return res.status(500).json({
          result: false,
          message: "Database path is not configured.",
        });
      }
      const fullDbPath = path.join(dbPath, dbName);

      // Check if the database file exists
      if (!fs.existsSync(fullDbPath)) {
        return res.status(404).json({
          result: false,
          message: "Database file not found.",
        });
      }

      // Delete the database file
      await unlinkAsync(fullDbPath);
      logger.info(`Database file deleted: ${fullDbPath}`);

      res.json({
        result: true,
        message: "Database successfully deleted.",
        backupFile: backupPath,
      });
    } catch (error) {
      logger.error("Error deleting the database:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error.",
        error: getErrorMessage(error),
      });
    }
  },
);

// 🔹 DELETE route to remove a specific table
router.delete(
  "/table/:tableName",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const resolved = resolveTableModel(req.params.tableName);
      const tableName = Array.isArray(req.params.tableName)
        ? req.params.tableName[0]
        : req.params.tableName;
      logger.info(`- in DELETE /admin-db/table/${tableName}`);

      // Check if the requested table exists in the models
      if (!resolved) {
        return res
          .status(400)
          .json({ result: false, message: `Table '${tableName}' not found.` });
      }
      const { model } = resolved;

      // Delete all records from the table
      await model.destroy({ where: {}, truncate: true });

      res.json({
        result: true,
        message: `Table '${tableName}' has been deleted.`,
      });
    } catch (error) {
      logger.error("Error deleting table:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

// DELETE /table-row/:tableName/:rowId : route to delete a specific row from a table
router.delete(
  "/table-row/:tableName/:rowId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const resolved = resolveTableModel(req.params.tableName);
      const rowId = Array.isArray(req.params.rowId)
        ? req.params.rowId[0]
        : req.params.rowId;
      const tableName = Array.isArray(req.params.tableName)
        ? req.params.tableName[0]
        : req.params.tableName;
      logger.info(`- in DELETE /admin-db/table-row/${tableName}/${rowId}`);

      // Check if the requested table exists in the models
      if (!resolved) {
        return res
          .status(400)
          .json({ result: false, message: `Table '${tableName}' not found.` });
      }
      const { model } = resolved;

      // Delete the specific row from the table
      await model.destroy({ where: { id: rowId } });

      res.json({
        result: true,
        message: `Row ${rowId} from table '${tableName}' has been deleted.`,
      });
    } catch (error) {
      logger.error("Error deleting row:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

// 🔹 PUT /admin-db/table-row/:tableName/:rowId : route to update a specific row from a table
router.put(
  "/table-row/:tableName/:rowId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const resolved = resolveTableModel(req.params.tableName);
      const tableName = Array.isArray(req.params.tableName)
        ? req.params.tableName[0]
        : req.params.tableName;
      const rowId = Array.isArray(req.params.rowId)
        ? req.params.rowId[0]
        : req.params.rowId;
      const dataToSave = req.body;
      logger.info(`- in PUT /admin-db/table-row/${tableName}/${rowId}`);
      logger.info("Incoming data:", dataToSave);

      // Validate table
      if (!resolved) {
        return res
          .status(400)
          .json({ result: false, message: `Table '${tableName}' not found.` });
      }

      const { model: Model } = resolved;

      let result;

      if (!rowId || rowId === "null" || rowId === "undefined") {
        // ➕ Create new record
        result = await Model.create(dataToSave);
      } else {
        // 🔁 Update existing record
        const [rowsUpdated] = await Model.update(dataToSave, {
          where: { id: rowId },
        });

        if (rowsUpdated === 0) {
          return res.status(404).json({
            result: false,
            message: `No record found with id ${rowId} in table '${tableName}'.`,
          });
        }

        result = await Model.findByPk(rowId); // Return updated record
      }

      return res.json({
        result: true,
        message: `Row ${
          rowId || result.id
        } in '${tableName}' successfully saved.`,
        // data: result,
      });
    } catch (error) {
      logger.error("Error saving row:", error);
      return res.status(500).json({
        result: false,
        message: "Internal server error",
        error: getErrorMessage(error),
      });
    }
  },
);

export = router;
