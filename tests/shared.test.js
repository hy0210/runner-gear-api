const express = require('express');
const request = require('supertest');
const { z } = require('zod');
const createApp = require('../src/app');
const AppError = require('../src/utils/app-error');
const asyncHandler = require('../src/utils/async-handler');
const { sendSuccess } = require('../src/utils/response');
const validate = require('../src/middlewares/validate');

const ALLOWED_ORIGIN = 'http://localhost:5173';

// 只在測試中掛上的路由，用來驗證共用機制本身
function buildTestRoutes() {
  const router = express.Router();
  const bodySchema = z.object({
    name: z.string().trim().min(1),
    quantity: z.number().int().positive(),
  });
  const querySchema = z.object({ page: z.coerce.number().int().positive().default(1) });

  router.post('/validate', validate({ body: bodySchema }), (req, res) => {
    sendSuccess(res, req.validated.body, 201);
  });
  router.get('/query', validate({ query: querySchema }), (req, res) => {
    sendSuccess(res, req.validated.query);
  });
  router.get(
    '/async-error',
    asyncHandler(async () => {
      throw new Error('內部細節：SELECT * FROM users at /app/src/secret.js');
    }),
  );
  router.get(
    '/app-error',
    asyncHandler(async () => {
      throw new AppError(409, '資料已存在');
    }),
  );
  return router;
}

const app = createApp({ extraRoutes: (instance) => instance.use('/test', buildTestRoutes()) });

describe('#3 回應格式一致', () => {
  test('成功回應為 { status: "success", data }', async () => {
    const res = await request(app).post('/test/validate').send({ name: '跑鞋', quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'success', data: { name: '跑鞋', quantity: 2 } });
  });

  test('驗證失敗：回應 400、status failed，並列出有問題的欄位', async () => {
    const res = await request(app).post('/test/validate').send({ name: '', quantity: -1 });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('failed');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.errors.map((e) => e.field).sort()).toEqual(['name', 'quantity']);
  });

  test('驗證 middleware 只把 schema 定義的欄位往後傳', async () => {
    const res = await request(app)
      .post('/test/validate')
      .send({ name: '跑鞋', quantity: 1, role: 'admin', userId: 99 });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ name: '跑鞋', quantity: 1 });
  });

  test('查詢參數也會被驗證與轉型', async () => {
    const ok = await request(app).get('/test/query?page=3');
    const bad = await request(app).get('/test/query?page=abc');

    expect(ok.body.data).toEqual({ page: 3 });
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].field).toBe('page');
  });

  test('非同步處理拋出未預期錯誤：回應 500 與固定訊息，不含內部內容', async () => {
    const res = await request(app).get('/test/async-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: '伺服器發生錯誤，請稍後再試' });
    expect(JSON.stringify(res.body)).not.toMatch(/SELECT|secret|stack|\/app\//);
  });

  test('已知的業務錯誤：依指定狀態碼回應，status 為 failed', async () => {
    const res = await request(app).get('/test/app-error');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ status: 'failed', message: '資料已存在' });
  });

  test('JSON 格式錯誤：回應 400 而不是 500', async () => {
    const res = await request(app)
      .post('/test/validate')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('failed');
  });
});

describe('#3 錯誤處理的邊界情況', () => {
  test('不支援的編碼：回應 415 與固定訊息，而不是 500', async () => {
    const res = await request(app)
      .post('/test/validate')
      .set('Content-Type', 'application/json; charset=foo')
      .send('{"name":"a","quantity":1}');

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ status: 'failed', message: '請求格式不被接受' });
  });

  test('未預期錯誤的記錄不包含 SQL 參數', () => {
    const env = require('../src/config/env');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('duplicate key'), {
      name: 'QueryFailedError',
      code: '23505',
      query: 'INSERT INTO "users" ...',
      parameters: ['someone@example.com', 'PASSWORD_HASH_VALUE'],
    });
    const res = { headersSent: false, status: jest.fn().mockReturnThis(), json: jest.fn() };

    try {
      // 測試環境不寫記錄，這裡以替換後的設定模擬正式環境
      jest.isolateModules(() => {
        jest.doMock('../src/config/env', () => ({ ...env, NODE_ENV: 'production' }));
        const isolated = require('../src/middlewares/error-handler');
        isolated.errorHandler(error, {}, res, jest.fn());
      });
    } finally {
      jest.dontMock('../src/config/env');
    }

    const logged = spy.mock.calls.flat().join(' ');
    spy.mockRestore();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(logged).toContain('QueryFailedError');
    expect(logged).not.toMatch(/PASSWORD_HASH_VALUE|someone@example\.com/);
  });
});

describe('#3 只接受白名單來源與合理大小的請求', () => {
  test('來源在白名單：回應帶 Access-Control-Allow-Origin', async () => {
    const res = await request(app).get('/health').set('Origin', ALLOWED_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  test('來源不在白名單：回應不帶 Access-Control-Allow-Origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('預檢請求：白名單來源可使用 Authorization 標頭', async () => {
    const res = await request(app)
      .options('/test/validate')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-headers']).toMatch(/authorization/i);
  });

  test('body 過大：回應 413', async () => {
    const res = await request(app)
      .post('/test/validate')
      .send({ name: 'a'.repeat(150 * 1024), quantity: 1 });

    expect(res.status).toBe(413);
    expect(res.body.status).toBe('failed');
  });

  test('安全標頭：有 helmet 的標頭，沒有 X-Powered-By', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('#3 CORS 白名單設定', () => {
  const { parseCorsOrigins } = require('../src/config/cors');

  test('以逗號分隔多個來源，去除空白與結尾斜線', () => {
    expect(parseCorsOrigins(' https://a.example.com/ , http://localhost:5173 ')).toEqual([
      'https://a.example.com',
      'http://localhost:5173',
    ]);
  });

  test('不接受萬用字元或不是網址的值', () => {
    expect(() => parseCorsOrigins('*')).toThrow();
    expect(() => parseCorsOrigins('not-a-url')).toThrow();
  });
});
