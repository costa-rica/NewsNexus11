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

const mockStateAssignerSql = {
  sqlQueryArticlesWithStateAssignments: jest.fn(),
};
jest.mock(
  "../../src/modules/analysis/state-assigner-sql",
  () => mockStateAssignerSql,
);

const mockStateAssignerModule = {
  formatArticlesWithStateAssignments: jest.fn(),
  validateStateAssignerRequest: jest.fn(),
  validateHumanVerifyRequest: jest.fn(),
};
jest.mock(
  "../../src/modules/analysis/state-assigner",
  () => mockStateAssignerModule,
);

const mockQueriesSql = {
  sqlQueryArticleDetails: jest.fn(),
  sqlQueryArticlesAndAiScores: jest.fn(),
};
jest.mock("../../src/modules/queriesSql", () => mockQueriesSql);

const mockArticlesModule = {
  formatArticleDetails: jest.fn(),
};
jest.mock("../../src/modules/articles", () => mockArticlesModule);

const mockArticleStateContract = {
  findOne: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
};
const mockArticleStateContract02 = {
  findOne: jest.fn(),
  update: jest.fn(),
};
const mockArtificialIntelligence = {
  findOne: jest.fn(),
};
const mockEntityWhoCategorizedArticle = {};

jest.mock("@newsnexus/db-models", () => ({
  ArticleStateContract: mockArticleStateContract,
  ArticleStateContract02: mockArticleStateContract02,
  ArtificialIntelligence: mockArtificialIntelligence,
  EntityWhoCategorizedArticle: mockEntityWhoCategorizedArticle,
}));

const stateAssignerRouter = require("../../src/routes/analysis/state-assigner");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/analysis/state-assigner", stateAssignerRouter);
  return app;
}

describe("analysis state assigner routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /analysis/state-assigner returns 400 for invalid request body", async () => {
    mockStateAssignerModule.validateStateAssignerRequest.mockReturnValue({
      isValid: false,
      error: "includeNullState must be a boolean value if provided",
    });

    const app = buildApp();
    const response = await request(app)
      .post("/analysis/state-assigner")
      .send({ includeNullState: "yes" });

    expect(response.status).toBe(400);
    expect(response.body.result).toBe(false);
  });

  test("POST /analysis/state-assigner returns formatted articles with AI scores", async () => {
    mockStateAssignerModule.validateStateAssignerRequest.mockReturnValue({
      isValid: true,
    });
    mockStateAssignerSql.sqlQueryArticlesWithStateAssignments.mockResolvedValue(
      [{ articleId: 10 }],
    );
    mockStateAssignerModule.formatArticlesWithStateAssignments.mockReturnValue([
      { id: 10, title: "Article 10", stateAssignment: { stateId: 5 } },
    ]);
    mockArtificialIntelligence.findOne
      .mockResolvedValueOnce({
        EntityWhoCategorizedArticles: [{ id: 101 }],
      })
      .mockResolvedValueOnce({
        EntityWhoCategorizedArticles: [{ id: 102 }],
      });
    mockQueriesSql.sqlQueryArticlesAndAiScores
      .mockResolvedValueOnce([
        { articleId: 10, keywordRating: 0.88, keyword: "recall" },
      ])
      .mockResolvedValueOnce([
        { articleId: 10, keywordRating: 0.75, keyword: "Ohio" },
      ]);

    const app = buildApp();
    const response = await request(app)
      .post("/analysis/state-assigner")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.articles[0]).toMatchObject({
      id: 10,
      semanticRatingMax: 0.88,
      locationClassifierScore: 0.75,
    });
  });

  test("POST /analysis/state-assigner/human-verify/:articleId returns 400 for invalid article id", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/analysis/state-assigner/human-verify/not-a-number")
      .send({ action: "approve", stateId: 5 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
