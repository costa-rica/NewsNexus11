import request from 'supertest';
import app from '../../src/app';

describe('app smoke tests', () => {
  it('returns service status at GET /', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ service: 'worker-node', status: 'up' });
  });

  it('returns health status at GET /health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'worker-node' });
  });
});
