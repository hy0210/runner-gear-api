const request = require('supertest');
const bcrypt = require('bcrypt');
const createApp = require('../src/app');
const { LIMITS } = require('../src/middlewares/rate-limit');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase, truncateAll } = require('./helpers/db');

const REGISTER = '/api/v1/auth/register';
const LOGIN = '/api/v1/auth/login';
const PRODUCTS = '/api/v1/products';
const validUser = { email: 'runner@example.com', password: 'password123', name: '小跑' };
const RATE_LIMITED = { status: 'failed', message: '嘗試次數過多，請稍後再試' };

beforeAll(resetDatabase);
beforeEach(truncateAll);
afterEach(() => jest.restoreAllMocks());
afterAll(closeDatabase);

describe('#21 登入總次數上限', () => {
  test('用正確帳密連續登入：超過上限回 429，且不執行密碼比對', async () => {
    const limited = createTestApp({ loginRateLimitMax: 3 });
    await request(limited).post(REGISTER).send(validUser);
    const login = () => request(limited).post(LOGIN).send({ email: validUser.email, password: validUser.password });

    const allowed = [await login(), await login(), await login()];
    const compare = jest.spyOn(bcrypt, 'compare');
    const blocked = await login();

    expect(allowed.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(RATE_LIMITED);
    expect(compare).not.toHaveBeenCalled();
  });

  test('失敗次數上限仍然有效：未達總次數上限也會被擋', async () => {
    const limited = createTestApp({ authRateLimitMax: 2, loginRateLimitMax: 50 });
    const attempt = () => request(limited).post(LOGIN).send({ email: 'a@example.com', password: 'x' });

    const results = [await attempt(), await attempt(), await attempt()];

    expect(results.map((r) => r.status)).toEqual([401, 401, 429]);
  });

  test('成功的登入不計入失敗次數，但計入總次數', async () => {
    const limited = createTestApp({ authRateLimitMax: 1, loginRateLimitMax: 3 });
    await request(limited).post(REGISTER).send(validUser);
    const login = () => request(limited).post(LOGIN).send({ email: validUser.email, password: validUser.password });

    const results = [await login(), await login(), await login(), await login()];

    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 429]);
  });

  test('登入總次數不影響註冊', async () => {
    const limited = createTestApp({ loginRateLimitMax: 1 });
    const attempt = () => request(limited).post(LOGIN).send({ email: 'a@example.com', password: 'x' });
    await attempt();
    await attempt();

    const res = await request(limited).post(REGISTER).send(validUser);

    expect(res.status).toBe(201);
  });

  test('不同來源分開計算', async () => {
    const limited = createTestApp({ loginRateLimitMax: 1 });
    const attemptFrom = (ip) =>
      request(limited).post(LOGIN).set('X-Forwarded-For', ip).send({ email: 'a@example.com', password: 'x' });

    const firstClient = [await attemptFrom('203.0.113.10'), await attemptFrom('203.0.113.10')];
    const secondClient = await attemptFrom('203.0.113.20');

    expect(firstClient.map((r) => r.status)).toEqual([401, 429]);
    expect(secondClient.status).toBe(401);
  });
});

describe('#21 全站請求上限', () => {
  test('超過上限回 429，並帶 RateLimit 與 Retry-After 標頭', async () => {
    const limited = createTestApp({ apiRateLimitMax: 3 });
    const list = () => request(limited).get(PRODUCTS);

    const allowed = [await list(), await list(), await list()];
    const blocked = await list();

    expect(allowed.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(RATE_LIMITED);
    expect(blocked.headers.ratelimit).toMatch(/remaining=0/);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  test('/api/v1 底下所有路由共用同一個計數（含不存在的路徑與需登入的路由）', async () => {
    const limited = createTestApp({ apiRateLimitMax: 3 });

    const results = [
      await request(limited).get(PRODUCTS),
      await request(limited).get('/api/v1/cart'),
      await request(limited).get('/api/v1/no-such-path'),
      await request(limited).get('/api/v1/categories'),
    ];

    expect(results.map((r) => r.status)).toEqual([200, 401, 404, 429]);
  });

  test('/health 與 /api-docs 不計入，被限流後仍可使用', async () => {
    const limited = createTestApp({ apiRateLimitMax: 1 });
    await request(limited).get('/health');
    await request(limited).get('/api-docs/openapi.json');
    await request(limited).get(PRODUCTS);
    const blocked = await request(limited).get(PRODUCTS);

    const health = await request(limited).get('/health');
    const docs = await request(limited).get('/api-docs/openapi.json');

    expect(blocked.status).toBe(429);
    expect(health.status).toBe(200);
    expect(docs.status).toBe(200);
  });

  test('不同來源分開計算，偽造在前面的轉送位址無效', async () => {
    const limited = createTestApp({ apiRateLimitMax: 1 });
    const listFrom = (forwardedFor) => request(limited).get(PRODUCTS).set('X-Forwarded-For', forwardedFor);

    const first = await listFrom('203.0.113.10');
    const spoofed = await listFrom('198.51.100.7, 203.0.113.10');
    const other = await listFrom('203.0.113.20');

    expect([first.status, spoofed.status, other.status]).toEqual([200, 429, 200]);
  });
});

describe('#21 正式啟動時的預設上限', () => {
  test('依前端的正常流程操作不會收到 429', async () => {
    const app = createApp();
    const agent = request(app);

    const statuses = [];
    statuses.push((await agent.get(PRODUCTS)).status);
    statuses.push((await agent.get('/api/v1/categories')).status);
    statuses.push((await agent.post(REGISTER).send(validUser)).status);
    const login = await agent.post(LOGIN).send({ email: validUser.email, password: validUser.password });
    statuses.push(login.status);
    for (let i = 0; i < 20; i += 1) {
      statuses.push((await agent.get('/api/v1/cart').set('Authorization', `Bearer ${login.body.data.token}`)).status);
    }

    expect(statuses).not.toContain(429);
  });

  test('預設上限：登入總次數 15 分鐘 60 次、失敗 20 次、全站每分鐘 300 次', async () => {
    const app = createApp();

    const login = await request(app).post(LOGIN).send({ email: 'a@example.com', password: 'x' });
    const list = await request(app).get(PRODUCTS);

    expect(LIMITS).toEqual({ AUTH: 20, LOGIN_TOTAL: 60, API: 300 });
    expect(list.headers['ratelimit-policy']).toBe('300;w=60');
    // 登入的回應標頭由最後執行的那一層（失敗次數）寫入
    expect(login.headers['ratelimit-policy']).toBe('20;w=900');
  });

  test('上限不能由請求放寬', async () => {
    const limited = createTestApp({ apiRateLimitMax: 1 });
    await request(limited).get(PRODUCTS);

    const res = await request(limited)
      .get(`${PRODUCTS}?apiRateLimitMax=1000`)
      .set('X-RateLimit-Limit', '1000')
      .set('RateLimit-Policy', '1000;w=60');

    expect(res.status).toBe(429);
  });
});
