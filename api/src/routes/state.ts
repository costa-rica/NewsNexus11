import express from "express";
import { ArticleStateContract, State } from "@newsnexus/db-models";
import { checkBodyReturnMissing } from "../modules/common";
import { authenticateToken } from "../modules/userAuthentication";
import logger from "../modules/logger";

const router = express.Router();

type SaveStateBody = {
  stateIdArray?: unknown;
};

router.get("/", async (_req, res) => {
  const statesArray = await State.findAll();
  res.json({ statesArray });
});

router.post("/:articleId", authenticateToken, async (req, res) => {
  logger.info("- starting /state/:articleId");
  const articleIdParam = Array.isArray(req.params.articleId)
    ? req.params.articleId[0]
    : req.params.articleId;
  const articleId = Number(articleIdParam);
  const body = req.body as SaveStateBody;
  const { stateIdArray } = body;
  const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
    "stateIdArray",
  ]);

  if (!isValid) {
    return res.status(400).json({ error: `Missing ${missingKeys.join(", ")}` });
  }
  if (!Number.isFinite(articleId)) {
    return res.status(400).json({ error: "Invalid articleId" });
  }
  if (!Array.isArray(stateIdArray)) {
    return res.status(400).json({ error: "stateIdArray must be an array" });
  }

  await ArticleStateContract.destroy({
    where: { articleId },
  });

  const articleStateContracts = stateIdArray
    .map((stateId) => Number(stateId))
    .filter((stateId) => Number.isFinite(stateId))
    .map((stateId) => ({
      articleId,
      stateId,
    }));

  await ArticleStateContract.bulkCreate(articleStateContracts);
  return res.json({ result: true, articleStateContracts });
});

export = router;
