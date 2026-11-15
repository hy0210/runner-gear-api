const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('#1 健康檢查', () => {
  test('服務正常：GET /health 回應 200 與 status success', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  test('健康檢查不洩漏環境資訊', async () => {
    const res = await request(app).get('/health');

    expect(JSON.stringify(res.body)).not.toMatch(/version|env|database|host/i);
  });

  test('路徑不存在：回應 404 與 JSON 錯誤訊息', async () => {
    const res = await request(app).get('/no-such-path');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.status).toBe('failed');
    expect(typeof res.body.message).toBe('string');
  });
});
