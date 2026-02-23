import express from 'express';
import { authenticateToken } from '../modules/userAuthentication';
import { sqlQueryArticlesApprovedForComponent } from '../modules/queriesSql';
import logger from '../modules/logger';

const router = express.Router();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

router.get('/for-component', authenticateToken, async (req, res) => {
  logger.info('- GET /articles-approveds/for-component');
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required.',
    });
  }

  try {
    const articlesArray = await sqlQueryArticlesApprovedForComponent(user.id);

    logger.info(`- articlesArray.length: ${articlesArray.length}`);

    res.json({
      articlesArray,
      count: articlesArray.length,
    });
  } catch (error) {
    logger.error('Error in /articles-approveds/for-component:', error);
    res.status(500).json({
      error: 'Failed to fetch approved articles for component.',
      message: getErrorMessage(error),
    });
  }
});

export = router;
