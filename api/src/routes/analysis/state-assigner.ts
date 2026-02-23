import express from "express";
import type { Request, Response } from "express";

const router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
import logger from "../../modules/logger";
const {
  ArticleStateContract,
  ArticleStateContract02,
  ArtificialIntelligence,
  EntityWhoCategorizedArticle,
} = require("@newsnexus/db-models");
const {
  sqlQueryArticlesWithStateAssignments,
} = require("../../modules/analysis/state-assigner-sql");
const {
  formatArticlesWithStateAssignments,
  validateStateAssignerRequest,
  validateHumanVerifyRequest,
} = require("../../modules/analysis/state-assigner");
const {
  sqlQueryArticleDetails,
  sqlQueryArticlesAndAiScores,
} = require("../../modules/queriesSql");
const { formatArticleDetails } = require("../../modules/articles");

/**
 * POST /analysis/state-assigner/
 * Returns articles with their AI-assigned state data from ArticleStateContract02,
 * semantic rating scores from NewsNexusSemanticScorer02, and location classifier
 * scores from NewsNexusClassifierLocationScorer01
 *
 * Request body:
 * {
 *   includeNullState: boolean (optional) - If true, return articles with null stateId
 *   targetArticleThresholdDaysOld: number (optional) - Filter articles published within the last N days
 * }
 *
 * Response:
 * {
 *   result: boolean,
 *   message: string,
 *   count: number,
 *   articles: [
 *     {
 *       id: number,
 *       title: string,
 *       description: string,
 *       url: string,
 *       createdAt: date,
 *       publishedDate: date,
 *       semanticRatingMax: number (nullable) - Highest semantic similarity score (0-1 range),
 *       semanticRatingMaxLabel: string (nullable) - Keyword with highest semantic similarity score,
 *       locationClassifierScore: number (nullable) - Location classifier confidence score (0-1 range),
 *       locationClassifierScoreLabel: string (nullable) - State name identified by location classifier,
 *       stateAssignment: {
 *         promptId: number,
 *         isHumanApproved: boolean,
 *         isDeterminedToBeError: boolean,
 *         occuredInTheUS: boolean,
 *         reasoning: string,
 *         stateId: number,
 *         stateName: string
 *       }
 *     }
 *   ]
 * }
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  logger.info("- in POST /analysis/state-assigner/");

  try {
    const { includeNullState, targetArticleThresholdDaysOld } = req.body || {};

    // Validate request parameters
    const validation = validateStateAssignerRequest(req.body || {});
    if (!validation.isValid) {
      return res.status(400).json({
        result: false,
        message: validation.error,
      });
    }

    logger.info(
      `Request parameters - includeNullState: ${includeNullState ?? false}, targetArticleThresholdDaysOld: ${targetArticleThresholdDaysOld ?? "not provided"}`,
    );

    // Query database for articles with state assignments
    const rawResults = await sqlQueryArticlesWithStateAssignments({
      includeNullState: includeNullState ?? false,
      targetArticleThresholdDaysOld,
    });

    // Format results for frontend
    const formattedArticles = formatArticlesWithStateAssignments(rawResults);

    logger.info(
      `Successfully retrieved ${formattedArticles.length} articles with state assignments`,
    );

    // Fetch semantic scores for articles
    let articlesWithSemanticScores = formattedArticles;
    if (formattedArticles.length > 0) {
      try {
        // Look up the semantic scorer AI entity (hardcoded)
        const semanticScorerEntity = await ArtificialIntelligence.findOne({
          where: { name: "NewsNexusSemanticScorer02" },
          include: [EntityWhoCategorizedArticle],
        });

        if (
          semanticScorerEntity &&
          semanticScorerEntity.EntityWhoCategorizedArticles?.length
        ) {
          const entityWhoCategorizedArticleId =
            semanticScorerEntity.EntityWhoCategorizedArticles[0].id;

          // Extract article IDs
          const articleIds = formattedArticles.map(
            (article: any) => article.id,
          );

          // Fetch AI scores
          const aiScores = await sqlQueryArticlesAndAiScores(
            articleIds,
            entityWhoCategorizedArticleId,
          );

          // Map scores back to articles
          articlesWithSemanticScores = formattedArticles.map((article: any) => {
            const aiScore = aiScores.find(
              (score: any) => score.articleId === article.id,
            );
            return {
              ...article,
              semanticRatingMax: aiScore?.keywordRating || null,
              semanticRatingMaxLabel: aiScore?.keyword || null,
            };
          });

          logger.info(
            `Added semantic scores for ${articlesWithSemanticScores.length} articles`,
          );
        } else {
          logger.warn(
            "NewsNexusSemanticScorer02 AI entity not found or has no EntityWhoCategorizedArticle",
          );
        }
      } catch (scoreError: any) {
        logger.error(
          "Error fetching semantic scores, returning articles without scores:",
          scoreError,
        );
        // Continue with articles without scores rather than failing the entire request
      }
    }

    // Fetch location classifier scores for articles
    let articlesWithAllAiScores = articlesWithSemanticScores;
    if (articlesWithSemanticScores.length > 0) {
      try {
        // Look up the location classifier AI entity (hardcoded)
        const locationClassifierEntity = await ArtificialIntelligence.findOne({
          where: { name: "NewsNexusClassifierLocationScorer01" },
          include: [EntityWhoCategorizedArticle],
        });

        if (
          locationClassifierEntity &&
          locationClassifierEntity.EntityWhoCategorizedArticles?.length
        ) {
          const entityWhoCategorizedArticleId =
            locationClassifierEntity.EntityWhoCategorizedArticles[0].id;

          // Extract article IDs
          const articleIds = articlesWithSemanticScores.map(
            (article: any) => article.id,
          );

          // Fetch location classifier scores
          const locationScores = await sqlQueryArticlesAndAiScores(
            articleIds,
            entityWhoCategorizedArticleId,
          );

          // Map scores back to articles
          articlesWithAllAiScores = articlesWithSemanticScores.map(
            (article: any) => {
              const locationScore = locationScores.find(
                (score: any) => score.articleId === article.id,
              );
              return {
                ...article,
                locationClassifierScore: locationScore?.keywordRating || null,
                locationClassifierScoreLabel: locationScore?.keyword || null,
              };
            },
          );

          logger.info(
            `Added location classifier scores for ${articlesWithAllAiScores.length} articles`,
          );
        } else {
          logger.warn(
            "NewsNexusClassifierLocationScorer01 AI entity not found or has no EntityWhoCategorizedArticle",
          );
        }
      } catch (scoreError: any) {
        logger.error(
          "Error fetching location classifier scores, returning articles without location scores:",
          scoreError,
        );
        // Continue with articles without location scores rather than failing the entire request
      }
    }

    // Return successful response
    res.status(200).json({
      result: true,
      message: "Successfully retrieved articles with state assignments",
      count: articlesWithAllAiScores.length,
      articles: articlesWithAllAiScores,
    });
  } catch (error: any) {
    logger.error("Error in POST /analysis/state-assigner/:", error);
    res.status(500).json({
      result: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * POST /analysis/state-assigner/human-verify/:articleId
 * Approve or reject an AI-assigned state for an article
 *
 * Request body:
 * {
 *   action: "approve" | "reject",
 *   stateId: number
 * }
 *
 * Response:
 * {
 *   status: string,
 *   stateHumanApprovedArray: [...],
 *   stateAiApproved: {...}
 * }
 */
router.post(
  "/human-verify/:articleId",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info("- in POST /analysis/state-assigner/human-verify/:articleId");

    try {
      const { articleId } = req.params;
      const normalizedArticleId = Array.isArray(articleId)
        ? articleId[0]
        : articleId;
      const { action, stateId } = req.body || {};

      logger.info(
        `articleId: ${normalizedArticleId}, action: ${action}, stateId: ${stateId}`,
      );

      // Validate articleId
      if (!normalizedArticleId || isNaN(parseInt(normalizedArticleId, 10))) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid article ID provided",
            details: "Article ID must be a valid number",
            status: 400,
          },
        });
      }

      // Validate request body
      const validation = validateHumanVerifyRequest(req.body || {});
      if (!validation.isValid) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error,
            status: 400,
          },
        });
      }

      const parsedArticleId = parseInt(normalizedArticleId, 10);

      // Check if ArticleStateContract02 row exists for this articleId and stateId
      const aiStateRow = await ArticleStateContract02.findOne({
        where: {
          articleId: parsedArticleId,
          stateId: stateId,
        },
      });

      if (!aiStateRow) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "AI state assignment not found",
            details: `No AI state assignment exists for article ${parsedArticleId} with state ${stateId}`,
            status: 404,
          },
        });
      }

      if (action === "approve") {
        // Update ArticleStateContract02 to set isHumanApproved = true
        await ArticleStateContract02.update(
          { isHumanApproved: true },
          {
            where: {
              articleId: parsedArticleId,
              stateId: stateId,
            },
          },
        );

        // Check if row already exists in ArticleStateContracts
        const existingHumanState = await ArticleStateContract.findOne({
          where: {
            articleId: parsedArticleId,
            stateId: stateId,
          },
        });

        if (existingHumanState) {
          return res.status(409).json({
            error: {
              code: "CONFLICT",
              message: "State already approved",
              details: `Article ${parsedArticleId} already has human-approved state ${stateId}`,
              status: 409,
            },
          });
        }

        // Create new row in ArticleStateContracts
        await ArticleStateContract.create({
          articleId: parsedArticleId,
          stateId: stateId,
        });

        logger.info(
          `Article ${parsedArticleId} state ${stateId} approved by human`,
        );
      } else if (action === "reject") {
        // Update ArticleStateContract02 to set isHumanApproved = false
        await ArticleStateContract02.update(
          { isHumanApproved: false },
          {
            where: {
              articleId: parsedArticleId,
              stateId: stateId,
            },
          },
        );

        // Delete row in ArticleStateContracts if it exists
        await ArticleStateContract.destroy({
          where: {
            articleId: parsedArticleId,
            stateId: stateId,
          },
        });

        logger.info(
          `Article ${parsedArticleId} state ${stateId} rejected by human`,
        );
      }

      // Re-query to get updated data
      const rawResults = await sqlQueryArticleDetails(parsedArticleId);
      const articleDetails = formatArticleDetails(rawResults);

      if (!articleDetails) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Article not found",
            details: `No article exists with ID ${parsedArticleId}`,
            status: 404,
          },
        });
      }

      // Return successful response
      res.status(200).json({
        status:
          action === "approve"
            ? "Article state approved successfully"
            : "Article state rejected successfully",
        stateHumanApprovedArray: articleDetails.stateHumanApprovedArray || [],
        stateAiApproved: articleDetails.stateAiApproved || null,
      });
    } catch (error: any) {
      logger.error(
        "Error in POST /analysis/state-assigner/human-verify/:articleId:",
        error,
      );
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process human verification",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
          status: 500,
        },
      });
    }
  },
);

export = router;
