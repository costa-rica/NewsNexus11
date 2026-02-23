import express from "express";
import type { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import {
  toAiContractValueFields,
  validateDynamicLlmAnalysis,
} from "../../modules/analysis/llmPayload";

const router = express.Router();
const {
  sequelize,
  ArtificialIntelligence,
  EntityWhoCategorizedArticle,
  Article,
  ArticleApproved,
  ArticleStateContract,
  ArticleEntityWhoCategorizedArticleContracts02,
} = require("@newsnexus/db-models");
const { authenticateToken } = require("../../modules/userAuthentication");
import logger from "../../modules/logger";
const sequelizeAny = sequelize as any;

// 🔹 GET /analysis/llm02/no-article-approved-rows
router.get(
  "/no-article-approved-rows",
  authenticateToken,
  async (_req: Request, res: Response) => {
    logger.info(`- in GET /analysis/llm02/no-article-approved-rows`);

    try {
      // Query to find articles that have NO corresponding row in ArticleApproveds
      // Returns up to 10,000 of the latest articles (ordered by id DESC)
      const sql = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.url,
        a."urlToImage",
        a."publishedDate",
        a."createdAt",
        a."updatedAt"
      FROM "Articles" a
      LEFT JOIN "ArticleApproveds" aa ON aa."articleId" = a.id
      WHERE aa.id IS NULL
      ORDER BY a.id DESC
      LIMIT 10000;
    `;

      const articles = await sequelizeAny.query(sql, {
        type: QueryTypes.SELECT,
      });

      logger.info(`Found ${articles.length} articles without approval rows`);

      res.status(200).json({
        result: true,
        count: articles.length,
        articles: articles,
      });
    } catch (error: any) {
      logger.error(
        "Error in GET /analysis/llm02/no-article-approved-rows:",
        error,
      );
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);

// 🔹 POST /analysis/llm02/service-login
router.post(
  "/service-login",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info(`- in POST /analysis/llm02/service-login`);

    try {
      const { name } = req.body;

      // Validate request body
      if (!name) {
        return res.status(400).json({
          result: false,
          message: "Missing required field: name",
        });
      }

      logger.info(`Looking up AI entity with name: ${name}`);

      // Query ArtificialIntelligence table with the provided name
      const aiModel = await ArtificialIntelligence.findOne({
        where: {
          name: name,
        },
        include: [
          {
            model: EntityWhoCategorizedArticle,
            as: "EntityWhoCategorizedArticles",
          },
        ],
      });

      // Check if AI entity exists
      if (!aiModel) {
        return res.status(404).json({
          result: false,
          message: `AI entity with name "${name}" not found in database`,
        });
      }

      // Get the associated EntityWhoCategorizedArticle
      const entity = aiModel?.EntityWhoCategorizedArticles?.[0];
      if (!entity) {
        return res.status(404).json({
          result: false,
          message: `No EntityWhoCategorizedArticle associated with AI entity "${name}"`,
        });
      }

      logger.info(
        `Found entityWhoCategorizesId: ${entity.id} for AI entity: ${aiModel.name}`,
      );

      // Return the entityWhoCategorizesId
      res.status(200).json({
        result: true,
        name: aiModel.name,
        entityWhoCategorizesId: entity.id,
      });
    } catch (error: any) {
      logger.error("Error in POST /analysis/llm02/service-login:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);

// 🔹 POST /analysis/llm02/update-approved-status
router.post(
  "/update-approved-status",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info(`- in POST /analysis/llm02/update-approved-status`);

    try {
      const authenticatedUser = req.user;
      if (!authenticatedUser) {
        return res.status(401).json({
          result: false,
          message: "Authentication required",
        });
      }

      const {
        articleId,
        isApproved,
        entityWhoCategorizesId,
        llmAnalysis,
        articleApprovedTextForPdfReport,
        stateId,
      } = req.body;

      // Validate required fields
      if (
        articleId === undefined ||
        isApproved === undefined ||
        !entityWhoCategorizesId ||
        !llmAnalysis
      ) {
        return res.status(400).json({
          result: false,
          message:
            "Missing required fields: articleId, isApproved, entityWhoCategorizesId, llmAnalysis",
        });
      }

      logger.info(
        `Processing articleId: ${articleId}, isApproved: ${isApproved}`,
      );

      const llmValidation = validateDynamicLlmAnalysis(llmAnalysis);
      if (!llmValidation.isValid) {
        const errorMessage =
          "error" in llmValidation
            ? llmValidation.error
            : "llmAnalysis payload is invalid";
        return res.status(400).json({
          result: false,
          message: errorMessage,
        });
      }
      const normalizedLlmAnalysis = llmValidation.value;

      // Step 1: Check if article already exists in ArticleApproveds
      const existingApproval = await ArticleApproved.findOne({
        where: { articleId },
        include: [
          {
            model: Article,
            as: "Article",
            attributes: ["title"],
          },
        ],
      });

      if (existingApproval) {
        logger.info(`Article ${articleId} already exists in ArticleApproveds`);
        return res.status(200).json({
          result: false,
          skipped: true,
          message: "Article already in ArticleApproveds table",
          articleId: articleId,
          title: existingApproval.Article?.title || "Unknown",
          existingIsApproved: existingApproval.isApproved,
        });
      }

      // Step 2: Check approval requirements
      // If isApproved=true, both isApproved and stateId must be provided
      if (isApproved === true && (stateId === null || stateId === undefined)) {
        logger.info(
          `Skipping article ${articleId}: isApproved=true but stateId is missing`,
        );
        return res.status(400).json({
          result: false,
          skipped: true,
          message:
            "Cannot approve article without stateId. Both isApproved=true and stateId are required for approval.",
          articleId: articleId,
        });
      }

      // Get the article for the title
      const article = await Article.findByPk(articleId);
      if (!article) {
        return res.status(404).json({
          result: false,
          message: `Article not found with ID: ${articleId}`,
        });
      }

      // Step 3: Create ArticleApproveds row
      logger.info(`Creating ArticleApproveds row for article ${articleId}`);
      const articleApproved = await ArticleApproved.create({
        articleId: articleId,
        userId: authenticatedUser.id, // From JWT token
        isApproved: isApproved,
        textForPdfReport: articleApprovedTextForPdfReport || null,
      });

      // Step 4: Create ArticleStateContracts row if approved and stateId provided
      let articleStateContract = null;
      if (isApproved === true && stateId) {
        logger.info(
          `Creating ArticleStateContracts row for article ${articleId} and state ${stateId}`,
        );
        articleStateContract = await ArticleStateContract.create({
          articleId: articleId,
          stateId: stateId,
        });
      }

      // Step 5: Create ArticleEntityWhoCategorizedArticleContracts02 rows
      logger.info(`Processing llmAnalysis for article ${articleId}`);

      // Delete existing records for this article + entity combination
      const deletedCount =
        await ArticleEntityWhoCategorizedArticleContracts02.destroy({
          where: {
            articleId: articleId,
            entityWhoCategorizesId: entityWhoCategorizesId,
          },
        });

      logger.info(
        `Deleted ${deletedCount} existing ArticleEntityWhoCategorizedArticleContracts02 records`,
      );

      const recordsToCreate = [];

      // Check if this is a failed LLM response
      if (normalizedLlmAnalysis.llmResponse === "failed") {
        // Failed case: only create llmResponse and llmName rows
        recordsToCreate.push({
          articleId: parseInt(articleId),
          entityWhoCategorizesId: entityWhoCategorizesId,
          key: "llmResponse",
          valueString: "failed",
          valueNumber: null,
          valueBoolean: null,
        });

        if (normalizedLlmAnalysis.llmName) {
          recordsToCreate.push({
            articleId: parseInt(articleId),
            entityWhoCategorizesId: entityWhoCategorizesId,
            key: "llmName",
            valueString: normalizedLlmAnalysis.llmName,
            valueNumber: null,
            valueBoolean: null,
          });
        }
      } else {
        // Success case: create rows for all analysis fields
        // Add llmResponse = "success"
        recordsToCreate.push({
          articleId: parseInt(articleId),
          entityWhoCategorizesId: entityWhoCategorizesId,
          key: "llmResponse",
          valueString: "success",
          valueNumber: null,
          valueBoolean: null,
        });

        // Add llmName
        if (normalizedLlmAnalysis.llmName) {
          recordsToCreate.push({
            articleId: parseInt(articleId),
            entityWhoCategorizesId: entityWhoCategorizesId,
            key: "llmName",
            valueString: normalizedLlmAnalysis.llmName,
            valueNumber: null,
            valueBoolean: null,
          });
        }

        // Process each field in llmAnalysis
        for (const [key, value] of Object.entries(normalizedLlmAnalysis)) {
          // Skip explicit rows we already added
          if (key === "llmName" || key === "llmResponse") continue;
          if (value === undefined) continue;

          const valueFields = toAiContractValueFields(value);
          const record: Record<string, any> = {
            articleId: parseInt(articleId),
            entityWhoCategorizesId: entityWhoCategorizesId,
            key: key,
            valueString: valueFields.valueString,
            valueNumber: valueFields.valueNumber,
            valueBoolean: valueFields.valueBoolean,
          };

          recordsToCreate.push(record);
        }
      }

      // Bulk create all records
      const createdRecords =
        await ArticleEntityWhoCategorizedArticleContracts02.bulkCreate(
          recordsToCreate,
        );

      logger.info(
        `Created ${createdRecords.length} ArticleEntityWhoCategorizedArticleContracts02 records`,
      );

      // Step 6: Return success response
      res.status(200).json({
        result: true,
        message: "Article approval status updated successfully",
        articleId: articleId,
        title: article.title,
        isApproved: isApproved,
        articleApproved: {
          id: articleApproved.id,
          created: true,
        },
        articleStateContract: articleStateContract
          ? {
              id: articleStateContract.id,
              created: true,
            }
          : {
              created: false,
            },
        llmAnalysisRecords: {
          deletedCount: deletedCount,
          createdCount: createdRecords.length,
        },
      });
    } catch (error: any) {
      logger.error(
        "Error in POST /analysis/llm02/update-approved-status:",
        error,
      );
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);

export = router;
