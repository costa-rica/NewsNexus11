import express from 'express';
import {
  ArticleApproved,
  ArtificialIntelligence,
  EntityWhoCategorizedArticle,
} from 'newsnexus10db';
import { authenticateToken } from '../modules/userAuthentication';
import { createFilteredArticlesArray } from '../modules/artificialIntelligence';
import logger from '../modules/logger';

const router = express.Router();

type AddEntityBody = {
  name?: unknown;
  description?: unknown;
  huggingFaceModelName?: unknown;
  huggingFaceModelType?: unknown;
};

router.post('/add-entity', authenticateToken, async (req, res) => {
  const body = req.body as AddEntityBody;
  const { name, description, huggingFaceModelName, huggingFaceModelType } = body;
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ message: 'name is required' });
  }

  logger.info('body.name: ', req.body.name);
  logger.info('body.description: ', req.body.description);
  logger.info('body.huggingFaceModelName: ', req.body.huggingFaceModelName);
  logger.info('body.huggingFaceModelType: ', req.body.huggingFaceModelType);

  const ai = await ArtificialIntelligence.create({
    name: name.trim(),
    description: typeof description === 'string' ? description : null,
    huggingFaceModelName: typeof huggingFaceModelName === 'string' ? huggingFaceModelName : null,
    huggingFaceModelType: typeof huggingFaceModelType === 'string' ? huggingFaceModelType : null,
  });

  const entity = await EntityWhoCategorizedArticle.create({
    artificialIntelligenceId: ai.id,
  });

  res.json({
    message: 'Artificial Intelligence created successfully',
    ai,
    entity,
  });
});

router.get('/articles-for-semantic-scoring', authenticateToken, async (_req, res) => {
  const aiModel = await ArtificialIntelligence.findOne({
    where: {
      name: 'NewsNexusSemanticScorer02',
      huggingFaceModelName: 'Xenova/paraphrase-MiniLM-L6-v2',
      huggingFaceModelType: 'feature-extraction',
    },
    include: [
      {
        model: EntityWhoCategorizedArticle,
        as: 'EntityWhoCategorizedArticles',
      },
    ],
  });

  const entity = (aiModel as any)?.EntityWhoCategorizedArticles?.[0];
  const entityWhoCategorizesId = entity?.id;
  if (!entityWhoCategorizesId) {
    return res.status(404).json({
      message: 'EntityWhoCategorizedArticle for semantic scorer not found',
    });
  }

  logger.info('EntityWhoCategorizedArticle:', entityWhoCategorizesId);
  const articlesArray = await createFilteredArticlesArray(entityWhoCategorizesId);

  const articlesArrayModified = articlesArray.map((article: any) => {
    let description = article.description;
    if (article.description === null || article.description === '') {
      const articleApproved = (article.ArticleApproveds as typeof ArticleApproved[])?.[0] as any;
      if (articleApproved) {
        description = articleApproved.textForPdfReport;
      }
    }
    return {
      id: article.id,
      title: article.title,
      description,
      publishedDate: article.publishedDate,
      url: article.url,
    };
  });

  res.json({
    articleCount: articlesArray.length,
    articlesArray: articlesArrayModified,
  });
});

export = router;
