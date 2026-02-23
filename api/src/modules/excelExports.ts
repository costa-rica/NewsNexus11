import ExcelJS from 'exceljs';
import logger from './logger';

export async function createSpreadsheetFromArray(
  array: Array<Record<string, unknown>>,
  outputFilePath: string | null = null
): Promise<Buffer | string> {
  if (!array || array.length === 0) {
    throw new Error('Array is empty or undefined.');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  const headers = Object.keys(array[0]);
  worksheet.addRow(headers);

  array.forEach((item) => {
    const row = headers.map((key) => item[key]);
    worksheet.addRow(row);
  });

  if (outputFilePath) {
    await workbook.xlsx.writeFile(outputFilePath);
    logger.info('Excel file saved to:', outputFilePath);
    return outputFilePath;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
