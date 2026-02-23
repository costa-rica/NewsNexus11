import logger from '../logger';

type StateAssignerRawRow = {
  articleId: number;
  title: string;
  description: string;
  url: string;
  createdAt: string | Date;
  publishedDate: string | Date;
  promptId: number | null;
  isHumanApproved: boolean | null;
  isDeterminedToBeError: boolean | null;
  occuredInTheUS: boolean | null;
  reasoning: string | null;
  stateId: number | null;
  stateName: string | null;
};

type ValidationResult = {
  isValid: boolean;
  error?: string;
};

/**
 * Format article state assignment data for the frontend
 * @param {Array} rawResults - Raw SQL query results
 * @returns {Array} Formatted articles with state assignment data
 */
function formatArticlesWithStateAssignments(rawResults: StateAssignerRawRow[]) {
  logger.info(`Formatting ${rawResults.length} articles`);

  return rawResults.map((row) => ({
    id: row.articleId,
    title: row.title,
    description: row.description,
    url: row.url,
    createdAt: row.createdAt,
    publishedDate: row.publishedDate,
    stateAssignment: {
      promptId: row.promptId,
      isHumanApproved: row.isHumanApproved,
      isDeterminedToBeError: row.isDeterminedToBeError,
      occuredInTheUS: row.occuredInTheUS,
      reasoning: row.reasoning,
      stateId: row.stateId,
      stateName: row.stateName,
    },
  }));
}

/**
 * Validate request parameters for state-assigner endpoint
 * @param {Object} body - Request body
 * @returns {Object} Object with isValid and error properties
 */
function validateStateAssignerRequest(body: Record<string, any>): ValidationResult {
  const { includeNullState, targetArticleThresholdDaysOld } = body;

  // includeNullState is optional, but if provided it should be boolean
  if (
    includeNullState !== undefined &&
    typeof includeNullState !== "boolean"
  ) {
    return {
      isValid: false,
      error: "includeNullState must be a boolean value if provided",
    };
  }

  // targetArticleThresholdDaysOld is optional, but if provided it should be a number
  if (targetArticleThresholdDaysOld !== undefined) {
    if (
      typeof targetArticleThresholdDaysOld !== "number" ||
      isNaN(targetArticleThresholdDaysOld)
    ) {
      return {
        isValid: false,
        error: "targetArticleThresholdDaysOld must be a valid number if provided",
      };
    }

    if (targetArticleThresholdDaysOld < 0) {
      return {
        isValid: false,
        error: "targetArticleThresholdDaysOld must be a non-negative number",
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate request parameters for human-verify endpoint
 * @param {Object} body - Request body
 * @returns {Object} Object with isValid and error properties
 */
function validateHumanVerifyRequest(body: Record<string, any>): ValidationResult {
  const { action, stateId } = body;

  // action is required and must be "approve" or "reject"
  if (!action) {
    return {
      isValid: false,
      error: "action field is required",
    };
  }

  if (action !== "approve" && action !== "reject") {
    return {
      isValid: false,
      error: 'action must be either "approve" or "reject"',
    };
  }

  // stateId is required and must be a number
  if (stateId === undefined || stateId === null) {
    return {
      isValid: false,
      error: "stateId field is required",
    };
  }

  if (typeof stateId !== "number" || isNaN(stateId)) {
    return {
      isValid: false,
      error: "stateId must be a valid number",
    };
  }

  return { isValid: true };
}

export {
  formatArticlesWithStateAssignments,
  validateStateAssignerRequest,
  validateHumanVerifyRequest,
};
