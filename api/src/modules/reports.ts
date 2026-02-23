import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import ExcelJS from "exceljs";
import { Report } from "@newsnexus/db-models";
import { convertJavaScriptDateToTimezoneString } from "./common";
import logger from "./logger";

type ReportRow = {
  refNumber: string | number;
  submitted: string | Date;
  headline: string;
  publication: string;
  datePublished: string | Date;
  state: string;
  text: string;
};

async function createXlsxForReport(
  dataArray: ReportRow[],
  excelFilename: string | false = false,
): Promise<string> {
  logger.info(` 🔹 createXlsxForReport`);
  const outputDir = process.env.PATH_PROJECT_RESOURCES_REPORTS;
  if (!outputDir) {
    throw new Error(
      "PATH_PROJECT_RESOURCES_REPORTS environment variable not set.",
    );
  }
  try {
    const javascriptDate = new Date();
    const dateParts = convertJavaScriptDateToTimezoneString(
      javascriptDate,
      "America/New_York",
    );
    const fileName =
      excelFilename ||
      `cr${dateParts.year.slice(2, 4)}${dateParts.month}${dateParts.day}.xlsx`;
    const filePath = path.join(outputDir, fileName);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");
    logger.info(`filename: ${fileName}`);
    const columns = [
      { header: "Ref #", key: "refNumber", width: 15 },
      {
        header: "Submitted",
        key: "submitted",
        width: 15,
        // style: { numFmt: "mm/dd/yyyy" }, // <-- Ensures Excel displays only date
      },
      { header: "Headline", key: "headline", width: 40 },
      { header: "Publication", key: "publication", width: 30 },
      {
        header: "Date",
        key: "datePublished",
        width: 15,
      },
      { header: "State", key: "state", width: 10 },
      { header: "Text", key: "text", width: 80 },
    ];

    worksheet.columns = columns;

    dataArray.sort((a, b) => {
      const refA = a.refNumber.toString();
      const refB = b.refNumber.toString();
      return refA.localeCompare(refB, undefined, { numeric: true });
    });

    dataArray.forEach((row) => {
      worksheet.addRow(row);
    });
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { wrapText: false, vertical: "top" };
      });
    });
    // logger.info(`dataArray: ${JSON.stringify(dataArray)}`);
    await workbook.xlsx.writeFile(filePath);
    logger.info("---> finished createXlsxForReport");
    return fileName;
  } catch (error: any) {
    logger.error(`Error creating XLSX file: ${error.message}`);
    throw error;
  }
}

function createCsvForReport(dataArray: ReportRow[]): string {
  const fields = [
    { label: "Ref #", value: "refNumber" },
    { label: "Submitted", value: "submitted" },
    { label: "Headline", value: "headline" },
    { label: "Publication", value: "publication" },
    { label: "Date", value: "datePublished" },
    { label: "State", value: "state" },
    { label: "Text", value: "text" },
  ];

  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(dataArray);

  const outputDir = process.env.PATH_PROJECT_RESOURCES_REPORTS;
  if (!outputDir) {
    throw new Error(
      "PATH_PROJECT_RESOURCES_REPORTS environment variable not set.",
    );
  }

  const nowET = convertJavaScriptDateToTimezoneString(
    new Date(),
    "America/New_York",
  ).dateString;
  // const timestamp = nowET.replace(/[-:]/g, "").replace("T", "-").slice(2, 8);
  const timestamp = nowET.replace(/[-:]/g, "").slice(2, 8);

  logger.info("-------- check timestamp --------");
  logger.info(`timestamp: ${timestamp}`);
  logger.info("---------------------------------");

  const fileName = `cr${timestamp}.csv`;
  const filePath = path.join(outputDir, fileName);
  // fs.writeFileSync(filePath, csv);
  fs.writeFileSync(filePath, "\uFEFF" + csv); // prepend UTF-8 BOM

  return fileName;
}

function createReportPdfFiles(dataArray: ReportRow[]): string {
  const outputDir = process.env.PATH_PROJECT_RESOURCES_REPORTS;
  if (!outputDir) {
    throw new Error(
      "PATH_PROJECT_RESOURCES_REPORTS environment variable not set.",
    );
  }

  const pdfOutputDir = path.join(outputDir, "article_pdfs");
  if (!fs.existsSync(pdfOutputDir)) {
    fs.mkdirSync(pdfOutputDir, { recursive: true });
  }

  dataArray.forEach((article) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(pdfOutputDir, `${article.refNumber}.pdf`);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const fields = [
      { label: "Ref #", value: article.refNumber },
      // format date to MM/DD/YYYY
      // { label: "Submitted", value: article.submitted.toLocaleDateString() },
      {
        label: "Submitted",
        value: new Date(article.submitted).toLocaleDateString("en-US", {
          year: "numeric",
          month: "numeric", // no leading zero
          day: "numeric", // no leading zero
          // hour: "2-digit",
          // minute: "2-digit",
          // hour12: false, // Use 24-hour format; change to true for AM/PM
        }),
      },
      { label: "Headline", value: article.headline },
      { label: "Publication", value: article.publication },
      {
        label: "Date",
        value: new Date(article.datePublished).toLocaleDateString(),
      },
      { label: "State", value: article.state },
      { label: "Text", value: article.text },
    ];

    fields.forEach(({ label, value }, index) => {
      if (index !== 0) {
        doc.moveDown(1);
      }
      doc.font("Helvetica-Bold").text(`${label} :`, { continued: true });
      doc.font("Helvetica").text(` ${value}`);
    });

    doc.end();
  });

  logger.info(`---> finished pdf creation`);
  return pdfOutputDir;
}

function createReportZipFile(
  csvFilename: string,
  zipFilename: string,
): Promise<string> {
  const outputDir = process.env.PATH_PROJECT_RESOURCES_REPORTS;
  if (!outputDir) {
    throw new Error(
      "PATH_PROJECT_RESOURCES_REPORTS environment variable not set.",
    );
  }

  const pdfDir = path.join(outputDir, "article_pdfs");

  // const now = new Date();
  // const timestamp = now
  //   .toISOString()
  //   .replace(/[-:]/g, "")
  //   .replace("T", "-")
  //   .slice(0, 8);

  // const zipFilename = `report_bundle_${timestamp}.zip`;
  const zipPath = path.join(outputDir, zipFilename);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      // ✅ Only run cleanup AFTER the zip file is fully written
      try {
        fs.unlinkSync(path.join(outputDir, csvFilename)); // delete .csv
        fs.rmSync(pdfDir, { recursive: true, force: true }); // delete pdf dir and all contents
        resolve(zipFilename);
      } catch (cleanupError) {
        reject(cleanupError);
      }
    });

    archive.on("error", (err: Error) => reject(err));
    archive.pipe(output);

    archive.file(path.join(outputDir, csvFilename), { name: csvFilename });
    archive.directory(pdfDir, "article_pdfs");

    archive.finalize();
  });
}

async function getDateOfLastSubmittedReport(): Promise<Date | null> {
  try {
    const latestReport = await Report.findOne({
      order: [["createdAt", "DESC"]],
    });

    if (!latestReport) return null;

    const createdAt = latestReport.createdAt;
    const submitted = latestReport.dateSubmittedToClient;

    if (!submitted) return createdAt;

    const sameDate =
      createdAt.toISOString().split("T")[0] ===
      submitted.toISOString().split("T")[0];

    if (sameDate) {
      return submitted; // same day, keep submitted timestamp
    } else {
      // Return date with time set to 20:00:00
      const adjusted = new Date(submitted);
      adjusted.setHours(20, 0, 0, 0);
      return adjusted;
    }
  } catch (error: any) {
    logger.error("Error in getDateOfLastSubmittedReport:", error);
    throw error;
  }
}

export {
  createCsvForReport,
  createReportPdfFiles,
  createReportZipFile,
  createXlsxForReport,
  getDateOfLastSubmittedReport,
};
