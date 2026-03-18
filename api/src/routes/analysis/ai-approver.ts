import express from "express";
import type { Request, Response } from "express";

const router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
const {
  AiApproverArticleScore,
  AiApproverPromptVersion,
} = require("@newsnexus/db-models");
import logger from "../../modules/logger";
import {
  parseNumericId,
  validatePromptActiveRequest,
  validatePromptCreateRequest,
  validatePromptHumanVerifyRequest,
  validateTopScoresRequest,
} from "../../modules/analysis/ai-approver";

router.get("/prompts", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const prompts = await AiApproverPromptVersion.findAll({
      order: [
        ["isActive", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    return res.status(200).json({
      result: true,
      count: prompts.length,
      prompts,
    });
  } catch (error: unknown) {
    logger.error("Error in GET /analysis/ai-approver/prompts:", error);
    return res.status(500).json({
      result: false,
      message: "Failed to fetch AI approver prompts",
    });
  }
});

router.post("/prompts", authenticateToken, async (req: Request, res: Response) => {
  try {
    const validation = validatePromptCreateRequest(req.body || {});
    if (!validation.isValid) {
      return res.status(400).json({
        result: false,
        message: validation.error,
      });
    }

    const { name, description, promptInMarkdown, isActive } = req.body;
    const prompt = await AiApproverPromptVersion.create({
      name: name.trim(),
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      promptInMarkdown: promptInMarkdown.trim(),
      isActive: Boolean(isActive),
      endedAt: null,
    });

    return res.status(201).json({
      result: true,
      message: "AI approver prompt created",
      prompt,
    });
  } catch (error: unknown) {
    logger.error("Error in POST /analysis/ai-approver/prompts:", error);
    return res.status(500).json({
      result: false,
      message: "Failed to create AI approver prompt",
    });
  }
});

router.post(
  "/prompts/:promptVersionId/copy",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const promptVersionId = parseNumericId(req.params.promptVersionId);
      if (promptVersionId === null) {
        return res.status(400).json({
          result: false,
          message: "Invalid promptVersionId",
        });
      }

      const sourcePrompt = await AiApproverPromptVersion.findByPk(promptVersionId);
      if (!sourcePrompt) {
        return res.status(404).json({
          result: false,
          message: "Prompt not found",
        });
      }

      const copiedPrompt = await AiApproverPromptVersion.create({
        name: `${sourcePrompt.name} (copy)`,
        description: sourcePrompt.description,
        promptInMarkdown: sourcePrompt.promptInMarkdown,
        isActive: false,
        endedAt: null,
      });

      return res.status(201).json({
        result: true,
        message: "AI approver prompt copied",
        prompt: copiedPrompt,
      });
    } catch (error: unknown) {
      logger.error(
        "Error in POST /analysis/ai-approver/prompts/:promptVersionId/copy:",
        error,
      );
      return res.status(500).json({
        result: false,
        message: "Failed to copy AI approver prompt",
      });
    }
  },
);

router.patch(
  "/prompts/:promptVersionId/active",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const promptVersionId = parseNumericId(req.params.promptVersionId);
      if (promptVersionId === null) {
        return res.status(400).json({
          result: false,
          message: "Invalid promptVersionId",
        });
      }

      const validation = validatePromptActiveRequest(req.body || {});
      if (!validation.isValid) {
        return res.status(400).json({
          result: false,
          message: validation.error,
        });
      }

      const prompt = await AiApproverPromptVersion.findByPk(promptVersionId);
      if (!prompt) {
        return res.status(404).json({
          result: false,
          message: "Prompt not found",
        });
      }

      const shouldBeActive = Boolean(req.body.isActive);
      await prompt.update({
        isActive: shouldBeActive,
        endedAt: shouldBeActive ? null : new Date(),
      });

      return res.status(200).json({
        result: true,
        message: shouldBeActive
          ? "AI approver prompt activated"
          : "AI approver prompt deactivated",
        prompt,
      });
    } catch (error: unknown) {
      logger.error(
        "Error in PATCH /analysis/ai-approver/prompts/:promptVersionId/active:",
        error,
      );
      return res.status(500).json({
        result: false,
        message: "Failed to update AI approver prompt active state",
      });
    }
  },
);

router.delete(
  "/prompts/:promptVersionId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const promptVersionId = parseNumericId(req.params.promptVersionId);
      if (promptVersionId === null) {
        return res.status(400).json({
          result: false,
          message: "Invalid promptVersionId",
        });
      }

      const prompt = await AiApproverPromptVersion.findByPk(promptVersionId);
      if (!prompt) {
        return res.status(404).json({
          result: false,
          message: "Prompt not found",
        });
      }

      const referencingScoreCount = await AiApproverArticleScore.count({
        where: { promptVersionId },
      });
      if (referencingScoreCount > 0) {
        return res.status(409).json({
          result: false,
          message:
            "Prompt cannot be deleted because AI approver score rows reference it.",
        });
      }

      await prompt.destroy();

      return res.status(200).json({
        result: true,
        message: "AI approver prompt deleted",
      });
    } catch (error: unknown) {
      logger.error(
        "Error in DELETE /analysis/ai-approver/prompts/:promptVersionId:",
        error,
      );
      return res.status(500).json({
        result: false,
        message: "Failed to delete AI approver prompt",
      });
    }
  },
);

router.get(
  "/article/:articleId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const articleId = parseNumericId(req.params.articleId);
      if (articleId === null) {
        return res.status(400).json({
          result: false,
          message: "Invalid articleId",
        });
      }

      const scores = await AiApproverArticleScore.findAll({
        where: { articleId },
        include: [{ model: AiApproverPromptVersion }],
        order: [
          ["score", "DESC"],
          ["id", "ASC"],
        ],
      });

      const scoreRows = scores.map((scoreRow: any) => ({
        id: scoreRow.id,
        articleId: scoreRow.articleId,
        promptVersionId: scoreRow.promptVersionId,
        resultStatus: scoreRow.resultStatus,
        score: scoreRow.score,
        reason: scoreRow.reason,
        errorCode: scoreRow.errorCode,
        errorMessage: scoreRow.errorMessage,
        isHumanApproved: scoreRow.isHumanApproved,
        reasonHumanRejected: scoreRow.reasonHumanRejected,
        createdAt: scoreRow.createdAt,
        updatedAt: scoreRow.updatedAt,
        promptVersion: scoreRow.AiApproverPromptVersion
          ? {
              id: scoreRow.AiApproverPromptVersion.id,
              name: scoreRow.AiApproverPromptVersion.name,
              description: scoreRow.AiApproverPromptVersion.description,
              promptInMarkdown:
                scoreRow.AiApproverPromptVersion.promptInMarkdown,
              isActive: scoreRow.AiApproverPromptVersion.isActive,
              endedAt: scoreRow.AiApproverPromptVersion.endedAt,
            }
          : null,
      }));

      const topEligible = scoreRows.find(
        (row: any) => row.isHumanApproved !== false,
      );

      return res.status(200).json({
        result: true,
        articleId,
        topEligibleScoreId: topEligible?.id ?? null,
        scores: scoreRows,
      });
    } catch (error: unknown) {
      logger.error(
        "Error in GET /analysis/ai-approver/article/:articleId:",
        error,
      );
      return res.status(500).json({
        result: false,
        message: "Failed to fetch AI approver article scores",
      });
    }
  },
);

router.post(
  "/top-scores",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const validation = validateTopScoresRequest(req.body || {});
      if (!validation.isValid) {
        return res.status(400).json({
          result: false,
          message: validation.error,
        });
      }

      const articleIds = req.body.articleIds as number[];
      const rows = await AiApproverArticleScore.findAll({
        where: { articleId: articleIds },
        include: [{ model: AiApproverPromptVersion }],
        order: [
          ["articleId", "ASC"],
          ["score", "DESC"],
          ["id", "ASC"],
        ],
      });

      const topScoresByArticleId = new Map<number, Record<string, unknown>>();
      for (const row of rows) {
        const rowAny = row as any;
        if (rowAny.isHumanApproved === false) {
          continue;
        }
        if (topScoresByArticleId.has(rowAny.articleId)) {
          continue;
        }
        topScoresByArticleId.set(rowAny.articleId, {
          id: rowAny.id,
          articleId: rowAny.articleId,
          promptVersionId: rowAny.promptVersionId,
          score: rowAny.score,
          resultStatus: rowAny.resultStatus,
          promptName: rowAny.AiApproverPromptVersion?.name ?? null,
        });
      }

      return res.status(200).json({
        result: true,
        topScores: Object.fromEntries(topScoresByArticleId),
      });
    } catch (error: unknown) {
      logger.error("Error in POST /analysis/ai-approver/top-scores:", error);
      return res.status(500).json({
        result: false,
        message: "Failed to fetch AI approver top scores",
      });
    }
  },
);

router.patch(
  "/human-verify/:scoreId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const scoreId = parseNumericId(req.params.scoreId);
      if (scoreId === null) {
        return res.status(400).json({
          result: false,
          message: "Invalid scoreId",
        });
      }

      const validation = validatePromptHumanVerifyRequest(req.body || {});
      if (!validation.isValid) {
        return res.status(400).json({
          result: false,
          message: validation.error,
        });
      }

      const scoreRow = await AiApproverArticleScore.findByPk(scoreId);
      if (!scoreRow) {
        return res.status(404).json({
          result: false,
          message: "AI approver score row not found",
        });
      }

      const articleScores = await AiApproverArticleScore.findAll({
        where: { articleId: scoreRow.articleId },
        order: [
          ["score", "DESC"],
          ["id", "ASC"],
        ],
      });

      const topEligible = articleScores.find(
        (row: any) => row.isHumanApproved !== false,
      );
      if (!topEligible || topEligible.id !== scoreRow.id) {
        return res.status(409).json({
          result: false,
          message:
            "Human validation can only be applied to the current highest non-rejected score row.",
        });
      }

      const isHumanApproved = req.body.isHumanApproved as boolean | null;
      const reasonHumanRejected =
        isHumanApproved === false
          ? (req.body.reasonHumanRejected as string).trim()
          : null;

      await scoreRow.update({
        isHumanApproved,
        reasonHumanRejected,
      });

      return res.status(200).json({
        result: true,
        message: "AI approver human validation updated",
        score: scoreRow,
      });
    } catch (error: unknown) {
      logger.error(
        "Error in PATCH /analysis/ai-approver/human-verify/:scoreId:",
        error,
      );
      return res.status(500).json({
        result: false,
        message: "Failed to update AI approver human validation",
      });
    }
  },
);

export = router;
