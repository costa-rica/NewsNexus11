import { Op } from "sequelize";

// Mock @newsnexus/db-models before importing the module under test
jest.mock("@newsnexus/db-models", () => ({
  Article: {
    count: jest.fn(),
  },
  ArticleApproved: {
    findAll: jest.fn(),
    count: jest.fn(),
  },
  ArticleIsRelevant: {
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));

import {
  Article,
  ArticleApproved,
  ArticleIsRelevant,
} from "@newsnexus/db-models";
import { getDatabaseStatus } from "../../src/modules/status";

describe("Database status module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDatabaseStatus()", () => {
    it("returns correct counts when database has articles, relevant, and approved records", async () => {
      // Mock ArticleIsRelevant.findAll
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([
        { articleId: 1 },
        { articleId: 2 },
      ]);

      // Mock ArticleApproved.findAll
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([
        { articleId: 3 },
        { articleId: 4 },
      ]);

      // Mock Article.count (first call - total articles)
      // Mock Article.count (second call - old articles)
      // Mock Article.count (third call - deletable old articles)
      (Article.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalArticles
        .mockResolvedValueOnce(30) // oldArticles
        .mockResolvedValueOnce(20); // deletableOldArticles

      // Mock ArticleIsRelevant.count
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(10); // irrelevantArticles

      // Mock ArticleApproved.count
      (ArticleApproved.count as jest.Mock).mockResolvedValue(5); // approvedArticles

      const result = await getDatabaseStatus();

      expect(result.totalArticles).toBe(100);
      expect(result.irrelevantArticles).toBe(10);
      expect(result.approvedArticles).toBe(5);
      expect(result.oldArticles).toBe(30);
      expect(result.deletableOldArticles).toBe(20);
      expect(result.cutoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns zero counts when all tables are empty", async () => {
      // Mock empty results
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      const result = await getDatabaseStatus();

      expect(result.totalArticles).toBe(0);
      expect(result.irrelevantArticles).toBe(0);
      expect(result.approvedArticles).toBe(0);
      expect(result.oldArticles).toBe(0);
      expect(result.deletableOldArticles).toBe(0);
    });

    it("computes deletableOldArticles by excluding articles in ArticleIsRelevant and ArticleApproved", async () => {
      // Articles 1 and 2 are in ArticleIsRelevant
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([
        { articleId: 1 },
        { articleId: 2 },
      ]);

      // Articles 3 and 4 are in ArticleApproved
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([
        { articleId: 3 },
        { articleId: 4 },
      ]);

      (Article.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalArticles
        .mockResolvedValueOnce(50) // oldArticles
        .mockResolvedValueOnce(46); // deletableOldArticles (50 - 4 protected)

      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      const result = await getDatabaseStatus();

      // Verify that Article.count was called with Op.notIn for protected IDs
      const lastCall = (Article.count as jest.Mock).mock.calls[2];
      const whereClause = lastCall[0].where[Op.and];

      expect(whereClause).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: { [Op.notIn]: expect.arrayContaining([1, 2, 3, 4]) },
          }),
        ]),
      );

      expect(result.deletableOldArticles).toBe(46);
    });

    it("uses the default 180-day threshold when no argument is passed", async () => {
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      const result = await getDatabaseStatus();

      // Calculate expected cutoff date (180 days ago)
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 180);
      const expectedCutoffString = expectedCutoff.toISOString().slice(0, 10);

      expect(result.cutoffDate).toBe(expectedCutoffString);
    });

    it("uses a custom threshold when a daysOldThreshold argument is provided", async () => {
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      const customThreshold = 90;
      const result = await getDatabaseStatus(customThreshold);

      // Calculate expected cutoff date (90 days ago)
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - customThreshold);
      const expectedCutoffString = expectedCutoff.toISOString().slice(0, 10);

      expect(result.cutoffDate).toBe(expectedCutoffString);
    });

    it("returns a cutoffDate string in YYYY-MM-DD format", async () => {
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      const result = await getDatabaseStatus();

      // Check format YYYY-MM-DD
      expect(result.cutoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's a valid date
      const parsedDate = new Date(result.cutoffDate);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(isNaN(parsedDate.getTime())).toBe(false);
    });

    it("handles overlapping articleIds in ArticleIsRelevant and ArticleApproved", async () => {
      // Article 1 appears in both tables
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([
        { articleId: 1 },
        { articleId: 2 },
      ]);

      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([
        { articleId: 1 }, // Overlapping with ArticleIsRelevant
        { articleId: 3 },
      ]);

      (Article.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalArticles
        .mockResolvedValueOnce(50) // oldArticles
        .mockResolvedValueOnce(47); // deletableOldArticles

      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      const result = await getDatabaseStatus();

      // Verify protected IDs are deduplicated (1, 2, 3) not (1, 2, 1, 3)
      const lastCall = (Article.count as jest.Mock).mock.calls[2];
      const whereClause = lastCall[0].where[Op.and];
      const notInClause = whereClause.find(
        (condition: { id?: { [Op.notIn]?: number[] } }) => condition.id,
      );

      expect(notInClause.id[Op.notIn]).toHaveLength(3);
      expect(notInClause.id[Op.notIn]).toEqual(
        expect.arrayContaining([1, 2, 3]),
      );
    });

    it("calls findAll with correct attributes for ArticleIsRelevant", async () => {
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      await getDatabaseStatus();

      expect(ArticleIsRelevant.findAll).toHaveBeenCalledWith({
        attributes: ["articleId"],
        raw: true,
      });
    });

    it("calls findAll with correct attributes for ArticleApproved", async () => {
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      await getDatabaseStatus();

      expect(ArticleApproved.findAll).toHaveBeenCalledWith({
        attributes: ["articleId"],
        raw: true,
      });
    });

    it("calls ArticleIsRelevant.count with correct parameters for irrelevant articles", async () => {
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      await getDatabaseStatus();

      expect(ArticleIsRelevant.count).toHaveBeenCalledWith({
        where: { isRelevant: false },
        distinct: true,
        col: "articleId",
      });
    });

    it("calls ArticleApproved.count with correct parameters for approved articles", async () => {
      (ArticleIsRelevant.findAll as jest.Mock).mockResolvedValue([]);
      (ArticleApproved.findAll as jest.Mock).mockResolvedValue([]);
      (Article.count as jest.Mock).mockResolvedValue(0);
      (ArticleIsRelevant.count as jest.Mock).mockResolvedValue(0);
      (ArticleApproved.count as jest.Mock).mockResolvedValue(0);

      await getDatabaseStatus();

      expect(ArticleApproved.count).toHaveBeenCalledWith({
        distinct: true,
        col: "articleId",
      });
    });
  });
});
