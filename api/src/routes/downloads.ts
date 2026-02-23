import express from 'express';
import fs from 'fs';
import path from 'path';
import { safeFileExists, safeFilePath } from '../middleware/fileSecurity';
import { fileOperationLimiter } from '../middleware/rateLimiting';
import { authenticateToken } from '../modules/userAuthentication';
import { createSpreadsheetFromArray } from '../modules/excelExports';
import logger from '../modules/logger';

const router = express.Router();

type DownloadExcelBody = {
  arrayToExport?: unknown;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

router.get(
  '/utilities/download-excel-file/:excelFileName',
  authenticateToken,
  fileOperationLimiter,
  async (req, res) => {
    logger.info(
      `- in GET /downloads/utilities/download-excel-file/${req.params.excelFileName}`
    );
    const excelFileName = Array.isArray(req.params.excelFileName)
      ? req.params.excelFileName[0]
      : req.params.excelFileName;

    try {
      const outputDir = process.env.PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS;
      if (!outputDir) {
        return res.status(500).json({
          result: false,
          message:
            'PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS environment variable not configured',
        });
      }

      const { valid, path: safePath, error } = safeFileExists(outputDir, excelFileName, {
        allowedExtensions: ['.xlsx', '.xls'],
      });

      if (!valid) {
        return res.status(404).json({
          result: false,
          message: error || 'File not found.',
        });
      }
      if (!safePath) {
        return res.status(404).json({
          result: false,
          message: 'File not found.',
        });
      }
      const filePath = safePath;

      logger.info(`Downloading file: ${filePath}`);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);

      res.download(filePath, path.basename(filePath), (err) => {
        if (err) {
          logger.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              result: false,
              message: 'File download failed.',
            });
          }
        }
      });
    } catch (error) {
      logger.error('Error processing request:', error);
      res.status(500).json({
        result: false,
        message: 'Internal server error',
        error: getErrorMessage(error),
      });
    }
  }
);

router.post(
  '/utilities/download-excel-file/:excelFileName',
  authenticateToken,
  fileOperationLimiter,
  async (req, res) => {
    logger.info(
      `- in POST /downloads/utilities/download-excel-file/${req.params.excelFileName}`
    );
    const excelFileName = Array.isArray(req.params.excelFileName)
      ? req.params.excelFileName[0]
      : req.params.excelFileName;
    const { arrayToExport } = req.body as DownloadExcelBody;

    const outputDir = process.env.PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS;
    if (!outputDir) {
      return res.status(500).json({
        result: false,
        message: 'PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS not configured',
      });
    }

    const safePath = safeFilePath(outputDir, excelFileName, {
      allowedExtensions: ['.xlsx', '.xls'],
    });
    if (!safePath) {
      return res.status(400).json({
        result: false,
        message: 'Invalid filename',
      });
    }

    if (!Array.isArray(arrayToExport)) {
      return res.status(400).json({
        result: false,
        message: 'arrayToExport must be an array',
      });
    }

    logger.info(`arrayToExport: ${typeof arrayToExport}`);
    logger.info(`arrayToExport first row: ${JSON.stringify(arrayToExport[0] ?? null)}`);

    await createSpreadsheetFromArray(arrayToExport as Array<Record<string, unknown>>, safePath);
    logger.info(`Excel file saved to: ${safePath}`);

    try {
      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ result: false, message: 'File not found.' });
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(safePath)}"`);

      res.download(safePath, path.basename(safePath), (err) => {
        if (err) {
          logger.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ result: false, message: 'File download failed.' });
          }
        }
      });
    } catch (error) {
      logger.error('Error processing request:', error);
      res.status(500).json({
        result: false,
        message: 'Internal server error',
        error: getErrorMessage(error),
      });
    }
  }
);

export = router;
