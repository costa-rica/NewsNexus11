import {
  Article,
  ArticleContent,
  ArticleStateContract,
  ArticleStateContract02,
  ArtificialIntelligence,
  EntityWhoCategorizedArticle,
  Prompt,
  State,
  initModels,
  sequelize
} from '@newsnexus/db-models';
import logger from '../logger';
import { QueueExecutionContext } from '../queue/queueEngine';

interface StateAssignerArticle {
  id: number;
  title: string;
  content: string;
}

interface PromptData {
  id: number;
  content: string;
}

export interface StateAssignerJobInput {
  targetArticleThresholdDaysOld: number;
  targetArticleStateReviewCount: number;
  keyOpenAi: string;
}

export interface StateAssignerJobContext extends StateAssignerJobInput {
  jobId: string;
  signal: AbortSignal;
}

export interface ChatGptResponse {
  occuredInTheUS: boolean;
  reasoning: string;
  state?: string;
}

export interface StateAssignerJobDependencies {
  runLegacyWorkflow?: (context: StateAssignerJobContext) => Promise<void>;
}

interface ProcessStateAssignmentsOptions {
  articles: StateAssignerArticle[];
  prompt: PromptData;
  entityWhoCategorizesId: number;
  keyOpenAi: string;
  iterationTimeoutMs: number;
  signal: AbortSignal;
  analyzeArticle: (
    keyOpenAi: string,
    promptTemplate: string,
    article: StateAssignerArticle,
    signal: AbortSignal
  ) => Promise<ChatGptResponse>;
  persistAssignment: (
    articleId: number,
    response: ChatGptResponse,
    promptId: number,
    entityWhoCategorizesId: number
  ) => Promise<void>;
  log: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

const LEGACY_AI_NAME = 'NewsNexusLlmStateAssigner01';
const DEFAULT_ITERATION_TIMEOUT_MS = 10_000;

let dbReadyPromise: Promise<void> | null = null;

const ensureDbReady = async (): Promise<void> => {
  if (dbReadyPromise) {
    return dbReadyPromise;
  }

  dbReadyPromise = (async () => {
    initModels();
    await sequelize.authenticate();
    await sequelize.sync();
  })();

  return dbReadyPromise;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'));

const resolveEntityWhoCategorizesId = async (): Promise<number> => {
  const aiEntity = await ArtificialIntelligence.findOne({
    where: { name: LEGACY_AI_NAME }
  });

  if (!aiEntity) {
    throw new Error(`No ArtificialIntelligence found with name: ${LEGACY_AI_NAME}`);
  }

  const categorizerEntity = await EntityWhoCategorizedArticle.findOne({
    where: { artificialIntelligenceId: aiEntity.id }
  });

  if (!categorizerEntity) {
    throw new Error(
      `No EntityWhoCategorizedArticle found with artificialIntelligenceId: ${aiEntity.id}`
    );
  }

  return categorizerEntity.id;
};

const getPrompt = async (): Promise<PromptData> => {
  const prompt = await Prompt.findOne({
    order: [['id', 'DESC']]
  });

  if (!prompt) {
    throw new Error('No prompts found in database');
  }

  return {
    id: prompt.id,
    content: prompt.promptInMarkdown
  };
};

const selectArticles = async (
  targetCount: number,
  thresholdDaysOld: number
): Promise<StateAssignerArticle[]> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDaysOld);
  const cutoffDateString = cutoffDate.toISOString().split('T')[0];

  logger.info(
    `Filtering articles published on or after ${cutoffDateString} (within ${thresholdDaysOld} days)`
  );

  const contract02ArticleIds = await ArticleStateContract02.findAll({
    attributes: ['articleId'],
    raw: true
  });

  const contractArticleIds = await ArticleStateContract.findAll({
    attributes: ['articleId'],
    raw: true
  });

  const assignedIds = [
    ...contract02ArticleIds
      .map((row) => (row as { articleId?: unknown }).articleId)
      .filter((value): value is number => typeof value === 'number'),
    ...contractArticleIds
      .map((row) => (row as { articleId?: unknown }).articleId)
      .filter((value): value is number => typeof value === 'number')
  ];

  const uniqueAssignedIds = [...new Set(assignedIds)];

  logger.info(
    `Found ${uniqueAssignedIds.length} articles with existing state assignments (${contract02ArticleIds.length} in ArticleStateContracts02, ${contractArticleIds.length} in ArticleStateContracts)`
  );

  const articles = await Article.findAll({
    order: [['id', 'DESC']]
  });

  const unassignedArticles = articles
    .filter((article) => Boolean(article.publishedDate) && article.publishedDate! >= cutoffDateString)
    .filter((article) => !uniqueAssignedIds.includes(article.id))
    .slice(0, targetCount);

  logger.info(`Found ${unassignedArticles.length} articles to process`);

  const articlesWithContent = await Promise.all(
    unassignedArticles.map(async (article) => {
      const articleContent = await ArticleContent.findOne({
        where: { articleId: article.id }
      });

      return {
        id: article.id,
        title: article.title ?? '',
        content: articleContent?.content || article.description || ''
      };
    })
  );

  return articlesWithContent;
};

const buildPrompt = (template: string, article: StateAssignerArticle): string =>
  template.replace('{articleTitle}', article.title).replace('{articleContent}', article.content);

const analyzeArticleWithOpenAi = async (
  keyOpenAi: string,
  promptTemplate: string,
  article: StateAssignerArticle,
  signal: AbortSignal
): Promise<ChatGptResponse> => {
  const prompt = buildPrompt(promptTemplate, article);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${keyOpenAi}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = completion.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('No response content from OpenAI');
  }

  const parsed = JSON.parse(rawContent) as ChatGptResponse;

  if (typeof parsed.occuredInTheUS !== 'boolean') {
    throw new Error("Invalid response: missing or invalid 'occuredInTheUS'");
  }
  if (typeof parsed.reasoning !== 'string' || parsed.reasoning.trim() === '') {
    throw new Error("Invalid response: missing 'reasoning'");
  }

  return parsed;
};

const saveArticleStateContract = async (
  articleId: number,
  response: ChatGptResponse,
  promptId: number,
  entityWhoCategorizesId: number
): Promise<void> => {
  let stateId: number | null = null;

  if (response.occuredInTheUS && response.state && response.state.trim() !== '') {
    const stateName = response.state.trim();

    let state = await State.findOne({ where: { name: stateName } });
    if (!state) {
      state = await State.findOne({ where: { abbreviation: stateName } });
    }

    stateId = state?.id ?? null;
    if (!stateId) {
      logger.warn(`State not found in database: ${stateName}. Saving article ${articleId} with stateId=null`);
    }
  }

  await ArticleStateContract02.create({
    articleId,
    stateId,
    entityWhoCategorizesId,
    promptId,
    isHumanApproved: false,
    isDeterminedToBeError: false,
    occuredInTheUS: response.occuredInTheUS,
    reasoning: response.reasoning
  });
};

const runWithIterationTimeout = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  iterationTimeoutMs: number,
  queueSignal: AbortSignal
): Promise<{ timedOut: boolean; value?: T }> => {
  const iterationAbortController = new AbortController();

  const onQueueAbort = () => {
    iterationAbortController.abort('job_canceled');
  };
  queueSignal.addEventListener('abort', onQueueAbort, { once: true });

  const timeout = setTimeout(() => {
    iterationAbortController.abort('iteration_timeout');
  }, iterationTimeoutMs);

  try {
    const value = await task(iterationAbortController.signal);
    return { timedOut: false, value };
  } catch (error) {
    if (
      iterationAbortController.signal.aborted &&
      iterationAbortController.signal.reason === 'iteration_timeout'
    ) {
      return { timedOut: true };
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    queueSignal.removeEventListener('abort', onQueueAbort);
  }
};

export const processStateAssignmentsWithTimeout = async ({
  articles,
  prompt,
  entityWhoCategorizesId,
  keyOpenAi,
  iterationTimeoutMs,
  signal,
  analyzeArticle,
  persistAssignment,
  log
}: ProcessStateAssignmentsOptions): Promise<void> => {
  for (let index = 0; index < articles.length; index += 1) {
    if (signal.aborted) {
      return;
    }

    const article = articles[index];
    log.info(`Processing article ${article.id} (${index + 1}/${articles.length})`);

    try {
      const result = await runWithIterationTimeout(
        (iterationSignal) => analyzeArticle(keyOpenAi, prompt.content, article, iterationSignal),
        iterationTimeoutMs,
        signal
      );

      if (result.timedOut) {
        log.warn(
          `State assigner timeout for article ${article.id} after ${iterationTimeoutMs}ms. Skipping iteration.`
        );
        continue;
      }

      await persistAssignment(article.id, result.value!, prompt.id, entityWhoCategorizesId);
      log.info(`Successfully processed article ${article.id}`);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown state assigner error';
      log.error(`Failed to process article ${article.id}: ${message}`);
      log.warn(`Skipping article ${article.id} and continuing with next article`);
    }
  }
};

const runLegacyWorkflow = async (context: StateAssignerJobContext): Promise<void> => {
  await ensureDbReady();

  const entityWhoCategorizesId = await resolveEntityWhoCategorizesId();
  const prompt = await getPrompt();
  const articles = await selectArticles(
    context.targetArticleStateReviewCount,
    context.targetArticleThresholdDaysOld
  );

  if (articles.length === 0) {
    logger.info('No articles to process');
    return;
  }

  logger.info(`Starting to process ${articles.length} articles`);

  await processStateAssignmentsWithTimeout({
    articles,
    prompt,
    entityWhoCategorizesId,
    keyOpenAi: context.keyOpenAi,
    iterationTimeoutMs: DEFAULT_ITERATION_TIMEOUT_MS,
    signal: context.signal,
    analyzeArticle: analyzeArticleWithOpenAi,
    persistAssignment: saveArticleStateContract,
    log: logger
  });
};

export const createStateAssignerJobHandler = (
  input: StateAssignerJobInput,
  dependencies: StateAssignerJobDependencies = {}
) => {
  const workflowRunner = dependencies.runLegacyWorkflow ?? runLegacyWorkflow;

  return async (queueContext: QueueExecutionContext): Promise<void> => {
    await workflowRunner({
      jobId: queueContext.jobId,
      signal: queueContext.signal,
      targetArticleThresholdDaysOld: input.targetArticleThresholdDaysOld,
      targetArticleStateReviewCount: input.targetArticleStateReviewCount,
      keyOpenAi: input.keyOpenAi
    });
  };
};
