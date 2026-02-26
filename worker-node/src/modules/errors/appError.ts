export interface ApiValidationDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(params: { status: number; code: string; message: string; details?: unknown }) {
    super(params.message);
    this.name = 'AppError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }

  static validation(details: ApiValidationDetail[]): AppError {
    return new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details
    });
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

export interface ApiErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    status: number;
  };
}
