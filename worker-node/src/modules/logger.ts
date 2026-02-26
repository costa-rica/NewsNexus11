import fs from 'node:fs';
import path from 'node:path';
import { createLogger, format, transports, Logger } from 'winston';
import { RuntimeNodeEnv } from './startup/config';

export interface LoggerConfig {
  nodeEnv: RuntimeNodeEnv;
  nameApp: string;
  pathToLogs: string;
  logMaxSizeMb: number;
  logMaxFiles: number;
}

const loggerFormat = format.combine(format.timestamp(), format.errors({ stack: true }), format.json());

const logger = createLogger({
  level: 'info',
  format: loggerFormat,
  transports: [new transports.Console({ silent: true })]
});

let loggerInitialized = false;

const ensureLogDirectory = (pathToLogs: string): void => {
  fs.mkdirSync(pathToLogs, { recursive: true });
};

const resolveLogLevel = (nodeEnv: RuntimeNodeEnv): string => {
  if (nodeEnv === 'development') {
    return 'debug';
  }

  return 'info';
};

const buildFileTransport = (config: LoggerConfig): transports.FileTransportInstance =>
  new transports.File({
    filename: path.join(config.pathToLogs, `${config.nameApp}.log`),
    maxsize: config.logMaxSizeMb * 1024 * 1024,
    maxFiles: config.logMaxFiles,
    tailable: true
  });

const buildTransports = (
  config: LoggerConfig
): Array<transports.ConsoleTransportInstance | transports.FileTransportInstance> => {
  const consoleTransport = new transports.Console();
  const fileTransport = buildFileTransport(config);

  if (config.nodeEnv === 'development') {
    return [consoleTransport];
  }

  if (config.nodeEnv === 'testing') {
    return [consoleTransport, fileTransport];
  }

  return [fileTransport];
};

const validateLoggerConfig = (config: LoggerConfig): void => {
  const missingKeys: string[] = [];

  if (!config.nodeEnv) {
    missingKeys.push('NODE_ENV');
  }
  if (!config.nameApp || config.nameApp.trim() === '') {
    missingKeys.push('NAME_APP');
  }
  if (!config.pathToLogs || config.pathToLogs.trim() === '') {
    missingKeys.push('PATH_TO_LOGS');
  }

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }
};

export const initializeLogger = (config: LoggerConfig): Logger => {
  validateLoggerConfig(config);
  ensureLogDirectory(config.pathToLogs);

  logger.configure({
    level: resolveLogLevel(config.nodeEnv),
    format: loggerFormat,
    transports: buildTransports(config)
  });

  loggerInitialized = true;
  return logger;
};

export const isLoggerInitialized = (): boolean => loggerInitialized;

export default logger;
