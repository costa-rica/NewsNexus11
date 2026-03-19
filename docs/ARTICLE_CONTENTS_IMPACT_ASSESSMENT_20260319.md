# ArticleContents Impact Assessment

1. reports/weekly-cpsc page (portal / api)
- Not used for report creation, recreation, download, or storage.
- The API builds report payloads from `ArticleApproveds.headlineForPdfReport`, `publicationNameForPdfReport`, `publicationDateForPdfReport`, and `textForPdfReport`.

2. /articles/review page (portal / api)
- The main review table does not appear to require `ArticleContents`.
- Partial dependency exists through the state-assigner details modal. That modal calls `/articles/article-details/:articleId`, and that API query left joins `ArticleContents` to return `articleContent`.
- Impact: review page can still load, but article-detail content in that modal may be blank or reduced.

3. /articles/get/google-rss (portal / api)
- `POST /google-rss/make-request` does not use `ArticleContents`.
- `POST /google-rss/add-to-database` does use it. The storage path inserts `ArticleContent` rows from RSS item `content` or `description`.
- Impact: querying the feed still works, but saving selected Google RSS items would stop populating article content rows.

4. Google RSS automation (worker-node)
- Used directly.
- The worker-node Google RSS job creates `ArticleContent` rows when RSS items include content.
- It stores RSS payload content directly and does not use the Cheerio/Puppeteer article-content scraper fallback flow.
- Impact: deleting the table would remove stored RSS body text and break that persistence path until recreated.

5. analysis/approved-article-duplicate (portal / api / worker-node)
- Not used in the deduper flow shown here.
- The API deduper reads from `ArticleApproveds`, `ArticleReportContract`, `ArticleDuplicateAnalysis`, `Article`, `ArticleStateContract`, and `State`.
- Worker-node is not part of this deduper path in the current repo.

Areas that do use the table

1. Article detail and state-assigner detail views
- `/articles/article-details/:articleId` joins `ArticleContents` and returns `articleContent`, which feeds the review-page state-assigner details modal.

2. Content scraping and AI preprocessing
- Worker-node article-content enrichment reads and writes `ArticleContents`.
- State assigner pre-scrape enrichment and content fallback behavior depend on it.

3. Ingestion and storage
- API Google RSS add-to-database writes `ArticleContents`.
- Worker-node Google RSS automation writes `ArticleContents`.
- Other ingestion paths in the repo also seed article content there.
