import {
  Article,
  ArticleApproved,
  ArticleEntityWhoCategorizedArticleContract,
} from 'newsnexus10db';

export async function createFilteredArticlesArray(entityWhoCategorizesId: number): Promise<any[]> {
  const existingContracts = await ArticleEntityWhoCategorizedArticleContract.findAll({
    where: { entityWhoCategorizesId },
    attributes: ['articleId'],
    raw: true,
  });

  const alreadyProcessedIds = new Set(
    existingContracts.map((entry: any) => entry.articleId)
  );

  const allArticles = await Article.findAll({
    include: [
      {
        model: ArticleApproved,
      },
    ],
  });

  const filteredArticles = allArticles.filter(
    (article: any) => !alreadyProcessedIds.has(article.id)
  );

  return filteredArticles;
}
