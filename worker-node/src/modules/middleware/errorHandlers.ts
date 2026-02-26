import type { NextFunction, Request, Response } from 'express';
import logger from '../logger';
import { ApiErrorResponseBody, AppError, isAppError } from '../errors/appError';

const buildErrorResponse = (
  status: number,
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponseBody => ({
  error: {
    code,
    message,
    status,
    ...(details === undefined ? {} : { details })
  }
});

const resolveInternalDetails = (error: unknown): string | undefined => {
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    return error.message;
  }

  return undefined;
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(
    new AppError({
      status: 404,
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`
    })
  );
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): Response<ApiErrorResponseBody> => {
  if (isAppError(error)) {
    logger.warn('Handled app error', {
      code: error.code,
      status: error.status,
      path: req.originalUrl,
      method: req.method
    });

    return res.status(error.status).json(
      buildErrorResponse(error.status, error.code, error.message, error.details)
    );
  }

  logger.error('Unhandled internal error', {
    path: req.originalUrl,
    method: req.method,
    errorMessage: error instanceof Error ? error.message : 'Unknown error'
  });

  return res
    .status(500)
    .json(buildErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', resolveInternalDetails(error)));
};
