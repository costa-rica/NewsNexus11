const REQUIRED_ENV_VARS = [
  "PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED",
  "PATH_TO_SEMANTIC_SCORER_DIR",
  "PATH_TO_LOGS",
  "NODE_ENV",
  "KEY_OPEN_AI",
  "PATH_TO_STATE_ASSIGNER_FILES",
  "NAME_APP",
  "NAME_DB",
  "PATH_DATABASE",
  "PATH_UTILTIES",
] as const;

export type RuntimeNodeEnv = "development" | "testing" | "production";

export interface AppConfig {
  pathAndFilenameForQuerySpreadsheetAutomated: string;
  pathToSemanticScorerDir: string;
  pathToLogs: string;
  nodeEnv: RuntimeNodeEnv;
  keyOpenAi: string;
  pathToStateAssignerFiles: string;
  nameApp: string;
  nameDb: string;
  pathDatabase: string;
  pathUtilities: string;
  logMaxSizeMb: number;
  logMaxFiles: number;
  port: number;
}

export class StartupConfigError extends Error {
  public readonly code = "CONFIG_VALIDATION_ERROR";
  public readonly missingKeys: string[];

  constructor(message: string, missingKeys: string[] = []) {
    super(message);
    this.name = "StartupConfigError";
    this.missingKeys = missingKeys;
  }
}

const parsePositiveInteger = (
  value: string | undefined,
  defaultValue: number,
  varName: string,
): number => {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new StartupConfigError(
      `Environment variable ${varName} must be a positive integer`,
    );
  }

  return parsed;
};

const normalizeNodeEnv = (value: string): RuntimeNodeEnv => {
  if (value === "test") {
    return "testing";
  }

  if (
    value === "development" ||
    value === "testing" ||
    value === "production"
  ) {
    return value;
  }

  throw new StartupConfigError(
    "Environment variable NODE_ENV must be one of development, testing, or production",
  );
};

const readRequiredString = (
  env: NodeJS.ProcessEnv,
  key: (typeof REQUIRED_ENV_VARS)[number],
): string => {
  const rawValue = env[key];
  if (rawValue === undefined || rawValue.trim() === "") {
    throw new StartupConfigError(
      `Missing required environment variable: ${key}`,
      [key],
    );
  }
  return rawValue;
};

export const loadAppConfig = (
  env: NodeJS.ProcessEnv = process.env,
): AppConfig => {
  const missingKeys = REQUIRED_ENV_VARS.filter((key) => {
    const rawValue = env[key];
    return rawValue === undefined || rawValue.trim() === "";
  });

  if (missingKeys.length > 0) {
    throw new StartupConfigError(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
      missingKeys,
    );
  }

  const nodeEnv = normalizeNodeEnv(readRequiredString(env, "NODE_ENV"));
  const port = parsePositiveInteger(env.PORT, 3002, "PORT");
  const logMaxSizeMb = parsePositiveInteger(
    env.LOG_MAX_SIZE,
    5,
    "LOG_MAX_SIZE",
  );
  const logMaxFiles = parsePositiveInteger(
    env.LOG_MAX_FILES,
    5,
    "LOG_MAX_FILES",
  );

  return {
    pathAndFilenameForQuerySpreadsheetAutomated: readRequiredString(
      env,
      "PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED",
    ),
    pathToSemanticScorerDir: readRequiredString(
      env,
      "PATH_TO_SEMANTIC_SCORER_DIR",
    ),
    pathToLogs: readRequiredString(env, "PATH_TO_LOGS"),
    nodeEnv,
    keyOpenAi: readRequiredString(env, "KEY_OPEN_AI"),
    pathToStateAssignerFiles: readRequiredString(
      env,
      "PATH_TO_STATE_ASSIGNER_FILES",
    ),
    nameApp: readRequiredString(env, "NAME_APP"),
    nameDb: readRequiredString(env, "NAME_DB"),
    pathDatabase: readRequiredString(env, "PATH_DATABASE"),
    pathUtilities: readRequiredString(env, "PATH_UTILTIES"),
    logMaxSizeMb,
    logMaxFiles,
    port,
  };
};

export const isStartupConfigError = (
  error: unknown,
): error is StartupConfigError => error instanceof StartupConfigError;
