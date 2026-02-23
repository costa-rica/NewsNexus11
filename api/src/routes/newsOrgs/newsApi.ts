import express from "express";
import { NewsArticleAggregatorSource } from "@newsnexus/db-models";
import { checkBodyReturnMissing } from "../../modules/common";
import logger from "../../modules/logger";

const {
  makeNewsApiRequest,
  makeNewsApiRequestDetailed,
  storeNewsApiArticles,
} = require("../../modules/newsOrgs/requestsNewsApi");

const router = express.Router();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

router.post("/request", async (req, res) => {
  logger.info("- starting request news-api");
  try {
    const { startDate, endDate, keywordString } = req.body;

    const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
      "startDate",
      "endDate",
      "keywordString",
    ]);
    if (!isValid) {
      return res.status(400).json({
        result: false,
        message: `Missing ${missingKeys.join(", ")}`,
      });
    }

    const newsApiSourceObj = await NewsArticleAggregatorSource.findOne({
      where: { nameOfOrg: "NewsAPI" },
      raw: true,
    });
    const { requestResponseData, newsApiRequest } = await makeNewsApiRequest(
      newsApiSourceObj,
      keywordString,
      startDate,
      endDate,
    );

    if (requestResponseData.status === "error") {
      return res.status(400).json({
        status: requestResponseData.status,
        result: false,
        message: requestResponseData.message,
      });
    }

    await storeNewsApiArticles(requestResponseData, newsApiRequest);

    res.json({
      result: true,
      message: "Request sent successfully",
      newsApiSourceObj,
    });
  } catch (error) {
    logger.error("Error in /request:", error);
    res.status(500).json({
      result: false,
      message: "NewsNexusAPI internal server error",
      error: getErrorMessage(error),
    });
  }
});

router.post("/get-articles", async (req, res) => {
  const {
    startDate,
    endDate,
    includeWebsiteDomainObjArray,
    excludeWebsiteDomainObjArray,
    keywordsAnd,
    keywordsOr,
    keywordsNot,
  } = req.body;

  const newsApiSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "NewsAPI" },
    raw: true,
  });

  const { requestResponseData, newsApiRequest } =
    await makeNewsApiRequestDetailed(
      newsApiSourceObj,
      startDate,
      endDate,
      includeWebsiteDomainObjArray,
      excludeWebsiteDomainObjArray,
      keywordsAnd,
      keywordsOr,
      keywordsNot,
    );

  if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === "true") {
    if (requestResponseData.articles) {
      logger.info("- articles count: ", requestResponseData.articles.length);
      await storeNewsApiArticles(requestResponseData, newsApiRequest, null);
    } else {
      logger.info("No articles element in response");
      return res.status(400).json({
        status: requestResponseData?.status || "error",
        result: false,
        message: requestResponseData?.message || "Failed to fetch articles",
      });
    }
  }

  res.json({
    result: true,
    requestResponseData,
    newsApiRequest,
  });
});

export = router;
