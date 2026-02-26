import express from 'express';
import request from 'supertest';
import { AppError } from '../../src/modules/errors/appError';
import { errorHandler, notFoundHandler } from '../../src/modules/middleware/errorHandlers';

const buildTestApp = (): express.Express => {
  const app = express();
  app.use(express.json());

  app.post('/validation-check', (req, _res, next) => {
    const name = req.body?.name;
    if (typeof name !== 'string' || name.trim() === '') {
      return next(
        AppError.validation([
          {
            field: 'name',
            message: 'name is required'
          }
        ])
      );
    }

    return next();
  });

  app.post('/validation-check', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get('/internal-error', () => {
    throw new Error('simulated failure');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

describe('errorHandlers', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns standardized validation error payload', async () => {
    const app = buildTestApp();
    const response = await request(app).post('/validation-check').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        status: 400,
        details: [{ field: 'name', message: 'name is required' }]
      }
    });
  });

  it('returns sanitized internal error payload in production mode', async () => {
    process.env.NODE_ENV = 'production';
    const app = buildTestApp();
    const response = await request(app).get('/internal-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500
      }
    });
  });
});
