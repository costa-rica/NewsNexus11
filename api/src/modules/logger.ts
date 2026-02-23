import fs from 'fs';
import path from 'path';
import winston from 'winston';

const requiredVars = {
  NODE_ENV: process.env.NODE_ENV,
  NAME_APP: process.env.NAME_APP,
  PATH_TO_LOGS: process.env.PATH_TO_LOGS,
};

const missingVars = Object.entries(requiredVars)
  .filter(([_key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(`FATAL ERROR: Missing required environment variable(s): ${missingVars.join(', ')}`);
  console.error('Logger cannot be initialized. Application will now exit.');
  process.exit(1);
}

const validEnvironments = ['development', 'testing', 'production'] as const;
if (!process.env.NODE_ENV || !validEnvironments.includes(process.env.NODE_ENV as any)) {
  console.error(`FATAL ERROR: NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  console.error(`Received: ${process.env.NODE_ENV}`);
  process.exit(1);
}

const NODE_ENV = process.env.NODE_ENV;
const NAME_APP = process.env.NAME_APP as string;
const PATH_TO_LOGS = process.env.PATH_TO_LOGS as string;

const LOG_MAX_SIZE = parseInt(process.env.LOG_MAX_SIZE || '5', 10) * 1024 * 1024;
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '5', 10);

try {
  if (!fs.existsSync(PATH_TO_LOGS)) {
    fs.mkdirSync(PATH_TO_LOGS, { recursive: true });
  }
} catch (error: any) {
  console.error(`FATAL ERROR: Cannot create log directory at ${PATH_TO_LOGS}`);
  console.error(error.message);
  process.exit(1);
}

function getLogLevel(): string {
  switch (NODE_ENV) {
    case 'development':
      return 'debug';
    case 'testing':
    case 'production':
      return 'info';
    default:
      return 'info';
  }
}

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${NAME_APP}] ${message}`;
    return stack ? `${baseMessage}\n${stack}` : baseMessage;
  })
);

function getTransports(): winston.transport[] {
  const transports: winston.transport[] = [];

  const fileTransportConfig = {
    filename: path.join(PATH_TO_LOGS, `${NAME_APP}.log`),
    maxsize: LOG_MAX_SIZE,
    maxFiles: LOG_MAX_FILES,
    tailable: true,
    format: logFormat,
  };

  const consoleTransportConfig = {
    format: winston.format.combine(winston.format.colorize(), logFormat),
  };

  switch (NODE_ENV) {
    case 'development':
      transports.push(new winston.transports.Console(consoleTransportConfig));
      break;

    case 'testing':
      transports.push(new winston.transports.Console(consoleTransportConfig));
      transports.push(new winston.transports.File(fileTransportConfig));
      break;

    case 'production':
      transports.push(new winston.transports.File(fileTransportConfig));
      break;
  }

  return transports;
}

const logger = winston.createLogger({
  level: getLogLevel(),
  transports: getTransports(),
  exitOnError: false,
});

logger.info('='.repeat(80));
logger.info('Logger initialized successfully');
logger.info(`Environment: ${NODE_ENV}`);
logger.info(`Log Level: ${getLogLevel()}`);
logger.info(`Application: ${NAME_APP}`);
if (NODE_ENV !== 'development') {
  logger.info(`Log Directory: ${PATH_TO_LOGS}`);
  logger.info(`Max File Size: ${LOG_MAX_SIZE / 1024 / 1024}MB`);
  logger.info(`Max Files: ${LOG_MAX_FILES}`);
}
logger.info('='.repeat(80));

export default logger;
