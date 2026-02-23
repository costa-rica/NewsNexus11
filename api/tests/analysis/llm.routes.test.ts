import express from 'express';
import request from 'supertest';

jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../src/modules/userAuthentication', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

jest.mock('../../src/modules/analysis/scraper', () => ({
  scrapeArticle: jest.fn().mockResolvedValue(''),
}));

const mockLlm04Module = {
  sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract: jest.fn(),
};
jest.mock('../../src/modules/analysis/llm04', () => mockLlm04Module);

const mockSequelize = {
  query: jest.fn(),
};
const mockArtificialIntelligence = {
  findOne: jest.fn(),
};
const mockArticle = {
  findByPk: jest.fn(),
};
const mockArticleApproved = {
  findOne: jest.fn(),
  create: jest.fn(),
};
const mockArticleStateContract = {
  create: jest.fn(),
};
const mockArticleEntityContracts02 = {
  destroy: jest.fn(),
  bulkCreate: jest.fn(),
};
const mockArticlesApproved02 = {
  findAll: jest.fn(),
};
const mockArticleIsRelevant = {
  findOne: jest.fn(),
};

jest.mock('newsnexus10db', () => ({
  sequelize: mockSequelize,
  ArtificialIntelligence: mockArtificialIntelligence,
  EntityWhoCategorizedArticle: {},
  Article: mockArticle,
  ArticleApproved: mockArticleApproved,
  ArticleStateContract: mockArticleStateContract,
  ArticleEntityWhoCategorizedArticleContracts02: mockArticleEntityContracts02,
  ArticlesApproved02: mockArticlesApproved02,
  ArticleIsRelevant: mockArticleIsRelevant,
}));

const llm01Router = require('../../src/routes/analysis/llm01');
const llm02Router = require('../../src/routes/analysis/llm02');
const llm04Router = require('../../src/routes/analysis/llm04');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/analysis/llm01', llm01Router);
  app.use('/analysis/llm02', llm02Router);
  app.use('/analysis/llm04', llm04Router);
  return app;
}

describe('analysis llm routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /analysis/llm01/:articleId returns 500 when KEY_OPEN_AI is not configured', async () => {
    delete process.env.KEY_OPEN_AI;
    mockArticle.findByPk.mockResolvedValue({
      id: 123,
      title: 'Article 123',
      description: 'Desc',
      url: 'https://example.com/123',
    });

    const app = buildApp();
    const response = await request(app).post('/analysis/llm01/123').send({});

    expect(response.status).toBe(500);
    expect(response.body.result).toBe(false);
    expect(response.body.message).toContain('KEY_OPEN_AI');
  });

  test('POST /analysis/llm02/service-login validates required name field', async () => {
    const app = buildApp();
    const response = await request(app).post('/analysis/llm02/service-login').send({});

    expect(response.status).toBe(400);
    expect(response.body.result).toBe(false);
  });

  test('POST /analysis/llm02/update-approved-status rejects invalid dynamic payload', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/analysis/llm02/update-approved-status')
      .send({
        articleId: 10,
        isApproved: false,
        entityWhoCategorizesId: 123,
        llmAnalysis: {
          llmResponse: 'bad-status',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.result).toBe(false);
    expect(response.body.message).toContain('llmResponse');
  });

  test('GET /analysis/llm02/no-article-approved-rows returns query results', async () => {
    mockSequelize.query.mockResolvedValue([
      { id: 5, title: 'No approval row article' },
    ]);

    const app = buildApp();
    const response = await request(app).get('/analysis/llm02/no-article-approved-rows');

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(response.body.count).toBe(1);
  });

  test('GET /analysis/llm04/approved filters approved AI rows', async () => {
    mockLlm04Module.sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract.mockResolvedValue([
      {
        id: 1,
        States: [{ abbreviation: 'TX' }],
        ArticlesApproved02: [{ isApproved: true }],
      },
      {
        id: 2,
        States: [{ abbreviation: 'CA' }],
        ArticlesApproved02: [{ isApproved: false }],
      },
    ]);

    const app = buildApp();
    const response = await request(app).get('/analysis/llm04/approved');

    expect(response.status).toBe(200);
    expect(response.body.articlesArray).toHaveLength(1);
    expect(response.body.articlesArray[0]).toMatchObject({
      id: 1,
      stateAbbreviation: 'TX',
    });
  });
});
