import express from 'express';
import { Article, ArticleApproved, State } from 'newsnexus10db';
import { authenticateToken } from '../../modules/userAuthentication';
import { getDateOfLastSubmittedReport } from '../../modules/reports';
import logger from '../../modules/logger';

const router = express.Router();

type StateCountRow = {
  State: string;
  Count: number;
  [key: string]: string | number;
};

router.get('/by-state', authenticateToken, async (_req, res) => {
  try {
    const lastReportDate = await getDateOfLastSubmittedReport();
    const currentMonth = new Date().toLocaleString('en-US', {
      month: 'long',
    });
    const stateCountsThisMonth: Record<string, number> = {};

    const approvedArticlesArray = await ArticleApproved.findAll({
      include: [
        {
          model: Article,
          include: [
            {
              model: State,
            },
          ],
        },
      ],
    });

    const unassignedArticlesArray: any[] = [];
    const stateCounts: Record<string, number> = {};
    const stateCountsSinceLastReport: Record<string, number> = {};

    for (const approved of approvedArticlesArray as any[]) {
      const article = approved.Article;
      let stateName = 'Unassigned';

      if (article && article.States && article.States.length > 0) {
        stateName = article.States[0].name;
      } else {
        unassignedArticlesArray.push(article);
      }

      stateCounts[stateName] = (stateCounts[stateName] || 0) + 1;

      if (lastReportDate && new Date(approved.createdAt) > new Date(lastReportDate)) {
        stateCountsSinceLastReport[stateName] = (stateCountsSinceLastReport[stateName] || 0) + 1;
      }

      const approvedDate = new Date(approved.createdAt);
      const now = new Date();
      const sameMonth =
        approvedDate.getMonth() === now.getMonth() &&
        approvedDate.getFullYear() === now.getFullYear();

      if (sameMonth) {
        stateCountsThisMonth[stateName] = (stateCountsThisMonth[stateName] || 0) + 1;
      }
    }

    const sumOfApproved = Object.values(stateCounts).reduce((sum, val) => sum + val, 0);

    const articleCountByStateArray: StateCountRow[] = Object.entries(stateCounts).map(
      ([state, count]) => ({
        State: state,
        Count: count,
        [currentMonth]: stateCountsThisMonth[state] || 0,
        'Count since last report': stateCountsSinceLastReport[state] || 0,
      })
    );

    articleCountByStateArray.push({
      State: 'Total',
      Count: sumOfApproved,
      [currentMonth]: Object.values(stateCountsThisMonth).reduce((sum, val) => sum + val, 0),
      'Count since last report': Object.values(stateCountsSinceLastReport).reduce(
        (sum, val) => sum + val,
        0
      ),
    });

    const totalRow = articleCountByStateArray.pop();

    articleCountByStateArray.sort((a, b) => b.Count - a.Count);

    if (totalRow) {
      articleCountByStateArray.push(totalRow);
    }

    res.json({ articleCountByStateArray, unassignedArticlesArray });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export = router;
