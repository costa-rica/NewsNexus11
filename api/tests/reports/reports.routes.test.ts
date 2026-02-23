import express from "express";
import request from "supertest";

jest.mock("../../src/modules/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../src/modules/userAuthentication", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 7, email: "reporter@example.com" };
    next();
  },
}));

jest.mock("../../src/modules/reports", () => ({
  createCsvForReport: jest.fn(),
  createReportPdfFiles: jest.fn(),
  createReportZipFile: jest.fn(),
  createXlsxForReport: jest.fn(),
  getDateOfLastSubmittedReport: jest.fn(),
}));

jest.mock("../../src/modules/common", () => ({
  convertJavaScriptDateToTimezoneString: jest.fn().mockReturnValue({
    year: "2026",
    month: "02",
    day: "22",
    dateString: "2026-02-22",
  }),
  createJavaScriptExcelDateObjectEastCoasUs: jest.fn(),
}));

const mockReportModel = {
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockArticleReportContractModel = {
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
};

jest.mock("@newsnexus/db-models", () => ({
  Report: mockReportModel,
  Article: { findAll: jest.fn() },
  ArticleApproved: { findAll: jest.fn() },
  State: { findByPk: jest.fn() },
  ArticleReportContract: mockArticleReportContractModel,
  ArticleStateContract: { findAll: jest.fn() },
}));

const reportsRouter = require("../../src/routes/reports");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/reports", reportsRouter);
  return app;
}

describe("reports routes contract tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /reports/table groups by CR name and normalizes invalid dates", async () => {
    mockReportModel.findAll.mockResolvedValue([
      {
        dateSubmittedToClient: "not-a-date",
        dataValues: { id: 1, nameCrFormat: "cr260222", nameZipFile: "a.zip" },
      },
      {
        dateSubmittedToClient: "2026-02-22",
        dataValues: { id: 2, nameCrFormat: "cr260222", nameZipFile: "b.zip" },
      },
      {
        dateSubmittedToClient: null,
        dataValues: { id: 3, nameCrFormat: "cr260223", nameZipFile: "c.zip" },
      },
    ]);

    const app = buildApp();
    const response = await request(app).get("/reports/table");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("reportsArray");
    expect(response.body.reportsArray).toHaveProperty("cr260222");
    expect(response.body.reportsArray.cr260222).toHaveLength(2);
    expect(response.body.reportsArray.cr260222[0].dateSubmittedToClient).toBe(
      "N/A",
    );
  });

  test("GET /reports returns reportsArrayByCrName grouped structure", async () => {
    mockReportModel.findAll.mockResolvedValue([
      {
        nameCrFormat: "cr260222",
        dateSubmittedToClient: "2026-02-22",
        toJSON: () => ({
          id: 10,
          nameCrFormat: "cr260222",
          dateSubmittedToClient: "2026-02-22",
        }),
      },
      {
        nameCrFormat: "cr260223",
        dateSubmittedToClient: null,
        toJSON: (): Record<string, unknown> => ({
          id: 11,
          nameCrFormat: "cr260223",
          dateSubmittedToClient: null,
        }),
      },
    ]);

    const app = buildApp();
    const response = await request(app).get("/reports");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("reportsArrayByCrName");
    expect(Array.isArray(response.body.reportsArrayByCrName)).toBe(true);
    expect(response.body.reportsArrayByCrName[0]).toHaveProperty("crName");
    expect(response.body.reportsArrayByCrName[0]).toHaveProperty(
      "reportsArray",
    );
  });

  test("POST /reports/update-submitted-to-client-date/:reportId updates report date", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    mockReportModel.findByPk.mockResolvedValue({
      id: 99,
      dateSubmittedToClient: null,
      save,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/reports/update-submitted-to-client-date/99")
      .send({ dateSubmittedToClient: "2026-02-22" });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(save).toHaveBeenCalled();
  });

  test("POST /reports/toggle-article-rejection/:id toggles accepted status", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    mockArticleReportContractModel.findByPk.mockResolvedValue({
      id: 77,
      articleAcceptedByCpsc: true,
      articleRejectionReason: "",
      save,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/reports/toggle-article-rejection/77")
      .send({ articleRejectionReason: "Insufficient details" });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(response.body.articleReportContract.articleAcceptedByCpsc).toBe(
      false,
    );
    expect(save).toHaveBeenCalled();
  });
});
