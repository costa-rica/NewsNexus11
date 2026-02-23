import { sequelize } from 'newsnexus10db';
import { QueryTypes } from 'sequelize';

const sequelizeAny = sequelize as any;

async function sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract(): Promise<
  Array<Record<string, any>>
> {
  const sql = `
    SELECT
      a.id AS "articleId",
      a.title,
      a.description,
      a.publishedDate,
      a.createdAt,
      a.publicationName,
      a.url,
      a.author,
      a.urlToImage,
      a.entityWhoFoundArticleId,
      a.newsApiRequestId,
      a.newsRssRequestId,
      s.id AS "stateId",
      s.name AS "stateName",
      s.abbreviation AS "stateAbbreviation",
      aa.id AS "approvedId",
      aa."artificialIntelligenceId" AS "approvedByAiId",
      aa."createdAt" AS "approvedAt",
      aa."isApproved",
      aa."headlineForPdfReport",
      aa."publicationNameForPdfReport",
      aa."publicationDateForPdfReport",
      aa."textForPdfReport",
      aa."urlForPdfReport",
      aa."kmNotes",
      ha."isApproved" AS "humanIsApproved"
    FROM "Articles" a
    LEFT JOIN "ArticleStateContracts" asc ON a.id = asc."articleId"
    LEFT JOIN "States" s ON s.id = asc."stateId"
    LEFT JOIN "ArticlesApproved02" aa ON aa."articleId" = a.id
    LEFT JOIN "ArticleApproveds" ha ON ha."articleId" = a.id
    ORDER BY a.id;
  `;

  const flatResults = await sequelizeAny.query(sql, {
    type: QueryTypes.SELECT,
  });

  const articlesMap = new Map<number, any>();

  for (const row of flatResults) {
    const {
      articleId,
      title,
      description,
      publishedDate,
      createdAt,
      publicationName,
      url,
      author,
      urlToImage,
      entityWhoFoundArticleId,
      newsApiRequestId,
      newsRssRequestId,
      stateId,
      stateName,
      stateAbbreviation,
      approvedId,
      approvedByAiId,
      approvedAt,
      isApproved,
      headlineForPdfReport,
      publicationNameForPdfReport,
      publicationDateForPdfReport,
      textForPdfReport,
      urlForPdfReport,
      kmNotes,
      humanIsApproved,
    } = row;

    if (!articlesMap.has(articleId)) {
      articlesMap.set(articleId, {
        id: articleId,
        title,
        description,
        publishedDate,
        createdAt,
        publicationName,
        url,
        author,
        urlToImage,
        entityWhoFoundArticleId,
        newsApiRequestId,
        newsRssRequestId,
        ArticleApprovedsIsApproved:
          humanIsApproved !== undefined ? humanIsApproved : null,
        States: [],
        ArticlesApproved02: [],
      });
    }

    if (stateId) {
      const stateExists = articlesMap
        .get(articleId)
        .States.some((s: any) => s.id === stateId);
      if (!stateExists) {
        articlesMap.get(articleId).States.push({
          id: stateId,
          name: stateName,
          abbreviation: stateAbbreviation,
        });
      }
    }

    if (approvedId) {
      const approvedExists = articlesMap
        .get(articleId)
        .ArticlesApproved02.some((a: any) => a.id === approvedId);
      if (!approvedExists) {
        articlesMap.get(articleId).ArticlesApproved02.push({
          id: approvedId,
          artificialIntelligenceId: approvedByAiId,
          createdAt: approvedAt,
          isApproved,
          headlineForPdfReport,
          publicationNameForPdfReport,
          publicationDateForPdfReport,
          textForPdfReport,
          urlForPdfReport,
          kmNotes,
        });
      }
    }
  }

  return Array.from(articlesMap.values());
}

export {
  sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract,
};
