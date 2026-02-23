jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import express from 'express';
import request from 'supertest';
import { loginLimiter } from '../../src/middleware/rateLimiting';

describe('rateLimiting middleware', () => {
  test('loginLimiter returns 429 after max failed attempts', async () => {
    const app = express();
    app.use(express.json());
    app.post('/login', loginLimiter, (_req, res) => {
      res.status(401).json({ result: false, error: 'Invalid password' });
    });

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'bad-password' });
      expect(response.status).toBe(401);
    }

    const blockedResponse = await request(app)
      .post('/login')
      .send({ email: 'test@example.com', password: 'bad-password' });

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual(
      expect.objectContaining({
        result: false,
      })
    );
  });
});
