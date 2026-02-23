import express from 'express';
import type { Request, Response } from 'express';

const router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
const {
  sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract,
} = require("../../modules/analysis/llm04");
const {
  ArticlesApproved02,
  ArticleApproved,
  ArticleIsRelevant,
} = require("newsnexus10db");
const logger = require("../../modules/logger");

// 🔹 GET /analysis/llm04/approved
router.get("/approved", authenticateToken, async (_req: Request, res: Response) => {
  logger.info("- GET /analysis/llm04/approved");
  const startTime = Date.now();
  const articlesArray =
    await sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract();

  logger.info(
    `- articlesArray.length (before filtering): ${articlesArray.length}`
  );

  const approvedArticlesArray = articlesArray.filter((article: any) =>
    article.ArticlesApproved02?.some(
      (entry: any) => entry.isApproved === true || entry.isApproved === 1
    )
  );

  const approvedArticlesArrayModified = approvedArticlesArray.map((article: any) => {
    let stateAbbreviation = "";
    if (article.States?.length === 1) {
      stateAbbreviation = article.States[0].abbreviation;
    } else if (article.States?.length > 1) {
      stateAbbreviation = article.States.map((state: any) => state.abbreviation).join(", ");
    }
    return {
      ...article,
      stateAbbreviation,
    };
  });

  logger.info(
    `- approvedArticlesArrayModified.length (after filtering): ${approvedArticlesArrayModified.length}`
  );

  const timeToRenderResponseFromApiInSeconds = (Date.now() - startTime) / 1000;
  res.json({
    articlesArray: approvedArticlesArrayModified,
    timeToRenderResponseFromApiInSeconds,
  });
});

// 🔹 GET /analysis/llm04/human-approved/:articleId
router.get(
  "/human-approved/:articleId",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info("- GET /analysis/llm04/human-approved/:articleId");
      const { articleId } = req.params;
      const normalizedArticleId = Array.isArray(articleId) ? articleId[0] : articleId;
      const authenticatedUser = req.user;
      if (!authenticatedUser) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }
      const userId = authenticatedUser.id;

    try {
      // 1. Look up ArticlesApproved02 records for this articleId
      const aiApprovedRecords = await ArticlesApproved02.findAll({
        where: { articleId },
      });

      // 2. Validate: No records found
      if (aiApprovedRecords.length === 0) {
        return res.status(404).json({
          error: `No row for articleId ${normalizedArticleId} in the ArticlesApproved02 table`,
        });
      }

      // 3. Validate: Multiple records found
      if (aiApprovedRecords.length > 1) {
        return res.status(400).json({
          error: `Multiple rows in the ArticlesApproved02 table for the same articleId ${normalizedArticleId}`,
        });
      }

      const aiApproved = aiApprovedRecords[0];

      // 4. Check ArticleIsRelevants table - if row exists, isRelevant must be true
      const relevanceRecord = await ArticleIsRelevant.findOne({
        where: { articleId },
      });

      if (relevanceRecord && relevanceRecord.isRelevant !== true) {
        return res.status(400).json({
          error: `Article ${normalizedArticleId} is marked as not relevant in ArticleIsRelevants table. To approve this article, you must first mark it as relevant - in the Articles Review Page.`,
        });
      }

      // 5. Check if ArticleApproveds record exists for this articleId
      const existingHumanApproval = await ArticleApproved.findOne({
        where: { articleId },
      });

      // 6. If exists with isApproved=true, return error
      if (existingHumanApproval && existingHumanApproval.isApproved === true) {
        return res.status(400).json({
          error: `This article has already been human approved`,
        });
      }

      // 7. Prepare data to copy from ArticlesApproved02
      const dataToSave = {
        articleId,
        userId,
        isApproved: aiApproved.isApproved,
        headlineForPdfReport: aiApproved.headlineForPdfReport,
        publicationNameForPdfReport: aiApproved.publicationNameForPdfReport,
        publicationDateForPdfReport: aiApproved.publicationDateForPdfReport,
        textForPdfReport: aiApproved.textForPdfReport,
        urlForPdfReport: aiApproved.urlForPdfReport,
      };

      // 8. Update or create record
      if (existingHumanApproval && existingHumanApproval.isApproved === false) {
        // Update existing record
        await existingHumanApproval.update(dataToSave);
      } else {
        // Create new record
        await ArticleApproved.create(dataToSave);
      }

      // 9. Return success message
      res.json({
        message: "Successfully human approved article",
      });
    } catch (error: any) {
      logger.error("Error in /human-approved/:articleId:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

export = router;
