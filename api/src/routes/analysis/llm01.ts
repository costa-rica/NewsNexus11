import express from "express";
import type { Request, Response } from "express";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import {
  toAiContractValueFields,
  validateDynamicLlmAnalysis,
} from "../../modules/analysis/llmPayload";

const router = express.Router();
const {
  Article,
  ArtificialIntelligence,
  EntityWhoCategorizedArticle,
  ArticleEntityWhoCategorizedArticleContracts02,
} = require("@newsnexus/db-models");
const { scrapeArticle } = require("../../modules/analysis/scraper");
const { authenticateToken } = require("../../modules/userAuthentication");
import logger from "../../modules/logger";
/**
 * Helper function to save AI response to file (optional/precautionary)
 * Errors are logged but don't affect the main flow
 */
async function saveResponseToFile(articleId: string, aiResponse: any) {
  try {
    const resourcesPath = process.env.PATH_PROJECT_RESOURCES;
    if (!resourcesPath) {
      throw new Error("PATH_PROJECT_RESOURCES is not configured");
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${articleId}_${timestamp}.json`;
    const responsesDir = path.join(resourcesPath, "llm-01/responses");
    const filePath = path.join(responsesDir, fileName);

    await fs.mkdir(responsesDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(aiResponse, null, 2), "utf-8");
    logger.info(`Response saved to: ${filePath}`);
    return { success: true, filePath };
  } catch (error: any) {
    logger.error("Error saving response to file:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to save parsed AI response to database
 * Stores key-value pairs in ArticleEntityWhoCategorizedArticleContracts02
 */
async function saveResponseToDatabase(
  articleId: string,
  aiResponse: any,
  scrapingStatus: string,
) {
  // Step 1: Look up "Open AI 4o mini API" entity
  const aiModel = await ArtificialIntelligence.findOne({
    where: {
      name: "Open AI 4o mini API",
    },
    include: [
      {
        model: EntityWhoCategorizedArticle,
        as: "EntityWhoCategorizedArticles",
      },
    ],
  });

  if (!aiModel) {
    throw new Error(
      'AI entity "Open AI 4o mini API" not found in database. Please create it first using POST /artificial-intelligence/add-entity',
    );
  }

  const entity = aiModel?.EntityWhoCategorizedArticles?.[0];
  if (!entity) {
    throw new Error(
      'No EntityWhoCategorizedArticle associated with "Open AI 4o mini API"',
    );
  }

  const entityWhoCategorizesId = entity.id;
  logger.info(
    `Using entityWhoCategorizesId: ${entityWhoCategorizesId} for AI entity: ${aiModel.name}`,
  );

  // Step 2: Parse the JSON response from AI
  const aiContent = aiResponse.choices?.[0]?.message?.content;
  if (!aiContent) {
    throw new Error("No content found in AI response");
  }

  let parsedContent;
  try {
    parsedContent = JSON.parse(aiContent);
  } catch (error: any) {
    throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
  }

  const payloadValidation = validateDynamicLlmAnalysis(parsedContent);
  if (!payloadValidation.isValid) {
    const errorMessage =
      "error" in payloadValidation
        ? payloadValidation.error
        : "llmAnalysis payload is invalid";
    throw new Error(`Invalid AI response payload: ${errorMessage}`);
  }

  const normalizedPayload = payloadValidation.value;
  logger.info("Parsed AI content:", normalizedPayload);

  // Step 3: Delete existing records with same articleId + entityWhoCategorizesId
  const deletedCount =
    await ArticleEntityWhoCategorizedArticleContracts02.destroy({
      where: {
        articleId: articleId,
        entityWhoCategorizesId: entityWhoCategorizesId,
      },
    });

  logger.info(
    `Deleted ${deletedCount} existing records for articleId ${articleId} and entityWhoCategorizesId ${entityWhoCategorizesId}`,
  );

  // Step 4: Create new records for each key-value pair
  const recordsToCreate = [];
  for (const [key, value] of Object.entries(normalizedPayload)) {
    if (value === undefined) {
      continue;
    }
    const valueFields = toAiContractValueFields(value);
    recordsToCreate.push({
      articleId: parseInt(articleId),
      entityWhoCategorizesId: entityWhoCategorizesId,
      key,
      valueString: valueFields.valueString,
      valueNumber: valueFields.valueNumber,
      valueBoolean: valueFields.valueBoolean,
    });
  }

  // Step 4b: Add scrapingStatus record
  recordsToCreate.push({
    articleId: parseInt(articleId),
    entityWhoCategorizesId: entityWhoCategorizesId,
    key: "scrapingStatus",
    valueString: scrapingStatus,
    valueNumber: null,
    valueBoolean: null,
  });

  // Bulk create all records
  const createdRecords =
    await ArticleEntityWhoCategorizedArticleContracts02.bulkCreate(
      recordsToCreate,
    );

  logger.info(`Created ${createdRecords.length} new records in database`);

  return {
    deletedCount,
    createdCount: createdRecords.length,
    records: createdRecords,
  };
}

// 🔹 POST /analysis/llm01/:articleId
router.post(
  "/:articleId",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info(`- in POST /analysis/llm01/:articleId`);

    try {
      const { articleId } = req.params;
      const normalizedArticleId = Array.isArray(articleId)
        ? articleId[0]
        : articleId;
      logger.info(`articleId: ${normalizedArticleId}`);

      // Step 1: Get article from database
      const article = await Article.findByPk(normalizedArticleId);

      if (!article) {
        return res.status(404).json({
          result: false,
          message: `Article not found with ID: ${normalizedArticleId}`,
        });
      }

      const { title, description, url } = article;
      logger.info(`Article found: ${title}`);

      // Step 2: Scrape article content from URL
      logger.info(`Attempting to scrape content from: ${url}`);
      const scrapedContent = await scrapeArticle(url);
      const scrapingStatus = scrapedContent ? "success" : "fail";
      logger.info(`Scraping status: ${scrapingStatus}`);

      // Step 3: Read the template file
      const templatePath = path.join(
        __dirname,
        "../../templates/prompt-markdown/prompt02.md",
      );
      let promptTemplate;

      try {
        promptTemplate = await fs.readFile(templatePath, "utf-8");
      } catch (error: any) {
        logger.error("Error reading template file:", error);
        return res.status(500).json({
          result: false,
          message: "Error reading template file",
          error: error.message,
        });
      }

      // Step 4: Replace placeholders in template and handle scraped content
      let prompt = promptTemplate
        .replace(/<< ARTICLE_TITLE >>/g, title || "")
        .replace(/<< ARTICLE_DESCRIPTION >>/g, description || "");

      // Conditionally handle scraped content
      if (scrapedContent) {
        // Replace placeholder with scraped content
        prompt = prompt.replace(
          /<< ARTICLE_SCRAPED_CONTENT >>/g,
          scrapedContent,
        );
      } else {
        // Remove the entire "### Article Content" section if scraping failed
        prompt = prompt.replace(
          /### Article Content\s*\n\s*<< ARTICLE_SCRAPED_CONTENT >>\s*/g,
          "",
        );
      }

      // Step 5: Call OpenAI API
      const openAiApiKey = process.env.KEY_OPEN_AI;
      if (!openAiApiKey) {
        return res.status(500).json({
          result: false,
          message: "KEY_OPEN_AI environment variable not configured",
        });
      }

      let aiResponse;
      let aiError = null;

      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0,
            max_tokens: 100,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiApiKey}`,
            },
          },
        );

        aiResponse = response.data;
        logger.info("OpenAI API response received");
      } catch (error: any) {
        logger.error("Error calling OpenAI API:", error.message);
        aiError = error.message;

        // If OpenAI fails, return error immediately (no response to save)
        return res.status(500).json({
          result: false,
          message: "Error calling OpenAI API",
          error: error.message,
        });
      }

      // Step 6: Save response to database (critical path)
      let dbSaveResult;
      try {
        dbSaveResult = await saveResponseToDatabase(
          normalizedArticleId,
          aiResponse,
          scrapingStatus,
        );
        logger.info(
          `Database save successful: ${dbSaveResult.createdCount} records created`,
        );
      } catch (error: any) {
        logger.error("Error saving to database:", error);
        // Database save failure is a critical error
        return res.status(500).json({
          result: false,
          message: "Error saving AI response to database",
          error: error.message,
          aiResponse: aiResponse,
        });
      }

      // Step 7: Save response to file (optional/precautionary)
      const fileSaveResult = await saveResponseToFile(
        normalizedArticleId,
        aiResponse,
      );

      // Step 8: Return response
      res.status(200).json({
        result: true,
        message:
          "Successfully processed article with OpenAI and saved to database",
        aiResponse: aiResponse,
        scraping: {
          status: scrapingStatus,
          contentLength: scrapedContent ? scrapedContent.length : 0,
        },
        database: {
          saved: true,
          deletedCount: dbSaveResult.deletedCount,
          createdCount: dbSaveResult.createdCount,
        },
        file: {
          saved: fileSaveResult.success,
          filePath: fileSaveResult.filePath || null,
          error: fileSaveResult.error || null,
        },
      });
    } catch (error: any) {
      logger.error("Error in POST /analysis/llm01/:articleId:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);

// 🔹 POST /analysis/llm01/scrape/:articleId (Test endpoint)
router.post(
  "/scrape/:articleId",
  authenticateToken,
  async (req: Request, res: Response) => {
    logger.info(`- in POST /analysis/llm01/scrape/:articleId`);

    try {
      const { articleId } = req.params;
      const normalizedArticleId = Array.isArray(articleId)
        ? articleId[0]
        : articleId;
      logger.info(`articleId: ${normalizedArticleId}`);

      // Step 1: Get article from database
      const article = await Article.findByPk(normalizedArticleId);

      if (!article) {
        return res.status(404).json({
          result: false,
          message: `Article not found with ID: ${normalizedArticleId}`,
        });
      }

      const { url, title } = article;
      logger.info(`Testing scrape for article: ${title}`);
      logger.info(`URL: ${url}`);

      // Step 2: Attempt to scrape
      const startTime = Date.now();
      let scrapedContent = null;
      let error = null;

      try {
        scrapedContent = await scrapeArticle(url);
      } catch (err: any) {
        error = {
          message: err.message,
          stack: err.stack,
        };
      }

      const duration = Date.now() - startTime;

      // Step 3: Return detailed results
      res.status(200).json({
        result: true,
        article: {
          id: normalizedArticleId,
          title: title,
          url: url,
        },
        scraping: {
          success: scrapedContent !== null,
          duration: `${duration}ms`,
          contentLength: scrapedContent ? scrapedContent.length : 0,
          content: scrapedContent,
          error: error,
        },
      });
    } catch (error: any) {
      logger.error("Error in POST /analysis/llm01/scrape/:articleId:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: error.message,
        stack: error.stack,
      });
    }
  },
);

export = router;
