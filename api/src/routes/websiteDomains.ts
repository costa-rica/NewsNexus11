import express from "express";
import { WebsiteDomain } from "@newsnexus/db-models";
import { checkBodyReturnMissing } from "../modules/common";
import { authenticateToken } from "../modules/userAuthentication";
import logger from "../modules/logger";

const router = express.Router();

type WebsiteDomainsArrayBody = {
  excludeArchievedNewsDataIo?: unknown;
};

type AddWebsiteDomainBody = {
  name?: unknown;
};

router.get("/", authenticateToken, async (_req, res) => {
  const websiteDomains = await WebsiteDomain.findAll();
  res.json({ websiteDomains });
});

router.post(
  "/get-website-domains-array",
  authenticateToken,
  async (req, res) => {
    const body = req.body as WebsiteDomainsArrayBody;
    const excludeArchievedNewsDataIo = body.excludeArchievedNewsDataIo === true;

    logger.info(
      "---> excludeArchievedNewsDataIo: ",
      excludeArchievedNewsDataIo,
    );
    let websiteDomainsArray;
    if (excludeArchievedNewsDataIo) {
      websiteDomainsArray = await WebsiteDomain.findAll({
        where: {
          isArchievedNewsDataIo: false,
        },
      });
      logger.info(
        "websiteDomainsArray (excludeArchievedNewsDataIo): ",
        websiteDomainsArray.length,
      );
    } else {
      websiteDomainsArray = await WebsiteDomain.findAll();
      logger.info("websiteDomainsArray: ", websiteDomainsArray.length);
    }

    res.json({ websiteDomainsArray });
  },
);

router.post("/add", authenticateToken, async (req, res) => {
  const body = req.body as AddWebsiteDomainBody;
  const { name } = body;
  const { isValid, missingKeys } = checkBodyReturnMissing(req.body, ["name"]);

  if (!isValid) {
    return res.status(400).json({ error: `Missing ${missingKeys.join(", ")}` });
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "name must be a non-empty string" });
  }

  const websiteDomain = await WebsiteDomain.create({ name: name.trim() });
  res.json({ result: true, websiteDomain });
});

export = router;
