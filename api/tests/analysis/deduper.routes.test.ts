import express from "express";
import request from "supertest";

jest.mock("../../src/modules/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../src/modules/userAuthentication", () => ({
  authenticateToken: (_req: any, _res: any, next: any) => next(),
}));

const mockDeduperModule = {
  makeArticleApprovedsTableDictionary: jest.fn(),
  createDeduperAnalysis: jest.fn(),
};
jest.mock("../../src/modules/analysis/deduper", () => mockDeduperModule);

const mockAxios = {
  get: jest.fn(),
  delete: jest.fn(),
};
jest.mock("axios", () => mockAxios);

const mockArticleReportContract = {
  findAll: jest.fn(),
};
const mockArticleDuplicateAnalysis = {
  findAll: jest.fn(),
  findOne: jest.fn(),
};
jest.mock("@newsnexus/db-models", () => ({
  ArticleReportContract: mockArticleReportContract,
  ArticleDuplicateAnalysis: mockArticleDuplicateAnalysis,
}));

const deduperRouter = require("../../src/routes/analysis/deduper");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/analysis/deduper", deduperRouter);
  return app;
}

describe("analysis deduper routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.URL_BASE_NEWS_NEXUS_PYTHON_QUEUER = "http://python-queuer/";
  });

  test("POST /analysis/deduper/report-checker-table returns report dictionary", async () => {
    mockDeduperModule.makeArticleApprovedsTableDictionary.mockResolvedValue({
      11: { headlineForPdfReport: "A", state: "TX" },
      12: { headlineForPdfReport: "B", state: "CA" },
    });
    mockArticleReportContract.findAll
      .mockResolvedValueOnce([
        { articleId: 11, articleReferenceNumberInReport: "r11" },
      ])
      .mockResolvedValueOnce([
        { articleId: 11, articleReferenceNumberInReport: "r11" },
        { articleId: 12, articleReferenceNumberInReport: "r12" },
      ]);
    mockArticleDuplicateAnalysis.findAll.mockResolvedValue([
      { articleIdApproved: 12, embeddingSearch: 0.9 },
    ]);
    mockDeduperModule.createDeduperAnalysis.mockResolvedValue(
      "/tmp/deduper_analysis.xlsx",
    );

    const app = buildApp();
    const response = await request(app)
      .post("/analysis/deduper/report-checker-table")
      .send({ reportId: 7, embeddingThresholdMinimum: 0.8, spacerRow: false });

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body.reportArticleDictionary["11"]).toBeDefined();
  });

  test("GET /analysis/deduper/request-job/:reportId returns 404 when report has no articles", async () => {
    mockArticleReportContract.findAll.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app).get(
      "/analysis/deduper/request-job/999",
    );

    expect(response.status).toBe(404);
    expect(response.body.result).toBe(false);
  });

  test("GET /analysis/deduper/job-list-status proxies Python queuer response", async () => {
    mockAxios.get.mockResolvedValue({
      data: { result: true, jobs: [{ reportId: 1, status: "pending" }] },
    });

    const app = buildApp();
    const response = await request(app).get(
      "/analysis/deduper/job-list-status",
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      result: true,
      jobs: [{ reportId: 1, status: "pending" }],
    });
  });
});
