jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const dbMock = {
  Article: {
    findAll: jest.fn()
  },
  ArticleIsRelevant: {
    findAll: jest.fn()
  },
  ArticleStateContract: {
    findAll: jest.fn()
  },
  ArticleStateContract02: {
    findAll: jest.fn()
  }
};

jest.mock('@newsnexus/db-models', () => dbMock);

import { selectTargetArticles } from '../../src/modules/articleTargeting';

describe('articleTargeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('excludes articles that have any ArticleIsRelevant row with isRelevant=false', async () => {
    dbMock.ArticleStateContract02.findAll.mockResolvedValue([]);
    dbMock.ArticleStateContract.findAll.mockResolvedValue([]);
    dbMock.ArticleIsRelevant.findAll.mockResolvedValue([{ articleId: 2 }]);
    dbMock.Article.findAll.mockResolvedValue([
      {
        id: 3,
        title: 'included article',
        description: 'included description',
        url: 'https://example.com/3',
        publishedDate: '2099-01-03'
      },
      {
        id: 2,
        title: 'excluded article',
        description: 'excluded description',
        url: 'https://example.com/2',
        publishedDate: '2099-01-02'
      },
      {
        id: 1,
        title: 'also included',
        description: 'also included description',
        url: 'https://example.com/1',
        publishedDate: '2099-01-01'
      }
    ]);

    const result = await selectTargetArticles({
      targetArticleThresholdDaysOld: 365,
      targetArticleStateReviewCount: 10
    });

    expect(dbMock.ArticleIsRelevant.findAll).toHaveBeenCalledWith({
      attributes: ['articleId'],
      where: { isRelevant: false },
      raw: true
    });
    expect(result.map((article) => article.id)).toEqual([3, 1]);
  });

  it('still excludes already-assigned articles and applies the review-count limit after filtering', async () => {
    dbMock.ArticleStateContract02.findAll.mockResolvedValue([{ articleId: 4 }]);
    dbMock.ArticleStateContract.findAll.mockResolvedValue([{ articleId: 3 }]);
    dbMock.ArticleIsRelevant.findAll.mockResolvedValue([{ articleId: 2 }]);
    dbMock.Article.findAll.mockResolvedValue([
      {
        id: 5,
        title: 'keep first',
        description: 'keep first description',
        url: 'https://example.com/5',
        publishedDate: '2099-01-05'
      },
      {
        id: 4,
        title: 'already assigned in 02',
        description: 'desc',
        url: 'https://example.com/4',
        publishedDate: '2099-01-04'
      },
      {
        id: 3,
        title: 'already assigned legacy',
        description: 'desc',
        url: 'https://example.com/3',
        publishedDate: '2099-01-03'
      },
      {
        id: 2,
        title: 'not relevant',
        description: 'desc',
        url: 'https://example.com/2',
        publishedDate: '2099-01-02'
      },
      {
        id: 1,
        title: 'keep second',
        description: 'keep second description',
        url: 'https://example.com/1',
        publishedDate: '2099-01-01'
      }
    ]);

    const result = await selectTargetArticles({
      targetArticleThresholdDaysOld: 365,
      targetArticleStateReviewCount: 1
    });

    expect(result.map((article) => article.id)).toEqual([5]);
  });
});
