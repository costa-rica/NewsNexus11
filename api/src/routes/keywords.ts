import express from "express";
import { Keyword } from "@newsnexus/db-models";
import { checkBodyReturnMissing } from "../modules/common";
import { authenticateToken } from "../modules/userAuthentication";

const router = express.Router();

type AddKeywordBody = {
  keyword?: unknown;
  category?: unknown;
};

router.post("/add-keyword", authenticateToken, async (req, res) => {
  const body = req.body as AddKeywordBody;
  const { keyword, category } = body;
  const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
    "keyword",
  ]);

  if (!isValid) {
    return res.status(400).json({ error: `Missing ${missingKeys.join(", ")}` });
  }
  if (typeof keyword !== "string" || keyword.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "keyword must be a non-empty string" });
  }

  await Keyword.create({
    keyword: keyword.trim(),
    category: typeof category === "string" ? category : null,
  });

  return res.json({ result: true });
});

router.get("/", authenticateToken, async (_req, res) => {
  const keywords = await Keyword.findAll({
    where: { isArchived: false },
  });
  const keywordsArray = keywords.map((keyword) => keyword.keyword);
  res.json({ keywordsArray });
});

export = router;
