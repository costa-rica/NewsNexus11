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

export = router;
