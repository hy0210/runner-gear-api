const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase, truncateAll, dataSource } = require('./helpers/db');
const { createUserWithToken, bearer } = require('./helpers/users');
const { auth, requireAdmin } = require('../src/middlewares/auth');
const { sendSuccess } = require('../src/utils/response');
const { User } = require('../src/entities');

const ME = '/api/v1/auth/me';

// 測試專用的管理員路由，用來驗證 requireAdmin（真正的管理員 API 在批次 3）
function adminOnlyRoutes(app) {
  const router = express.Router();
  router.get('/admin-only', auth, requireAdmin, (req, res) => sendSuccess(res, { id: req.user.id }));
  app.use('/test', router);
}

const app = createTestApp({ extraRoutes: adminOnlyRoutes });

beforeAll(resetDatabase);
beforeEach(truncateAll);
afterAll(closeDatabase);

describe('#5 受保護的 API 需要有效的 JWT', () => {
  test('有效的 Token：回應 200 與該會員資料（不含密碼）', async () => {
    const { user, token } = await createUserWithToken();

    const res = await request(app).get(ME).set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({ id: user.id, email: user.email, name: user.name, role: 'member' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('沒有帶 Token：回應 401', async () => {
    const res = await request(app).get(ME);

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('failed');
  });

  test.each([
    ['不是 Bearer 格式', (token) => ({ Authorization: token })],
    ['Bearer 後面是亂碼', () => ({ Authorization: 'Bearer not-a-jwt' })],
    ['Bearer 後面是空的', () => ({ Authorization: 'Bearer ' })],
  ])('Token 格式錯誤（%s）：回應 401', async (_label, buildHeader) => {
    const { token } = await createUserWithToken();

    const res = await request(app).get(ME).set(buildHeader(token));

    expect(res.status).toBe(401);
  });

  test('簽章錯誤：回應 401', async () => {
    const { user } = await createUserWithToken();
    const forged = jwt.sign({}, 'another-secret-'.repeat(3), { subject: String(user.id), expiresIn: '1h' });

    const res = await request(app).get(ME).set(bearer(forged));

    expect(res.status).toBe(401);
  });

  test('Token 已過期：回應 401', async () => {
    const { user } = await createUserWithToken();
    const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: -10 });

    const res = await request(app).get(ME).set(bearer(expired));

    expect(res.status).toBe(401);
  });

  test('未簽章（alg: none）的 Token：回應 401', async () => {
    const { user } = await createUserWithToken();
    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: String(user.id) })}.`;

    const res = await request(app).get(ME).set(bearer(unsigned));

    expect(res.status).toBe(401);
  });

  test('Token 對應的會員已不存在：回應 401', async () => {
    const { user, token } = await createUserWithToken();
    await dataSource.getRepository(User).delete({ id: user.id });

    const res = await request(app).get(ME).set(bearer(token));

    expect(res.status).toBe(401);
  });

  test('各種 401 的訊息相同，不透露失敗原因', async () => {
    const { user } = await createUserWithToken();
    const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: -10 });

    const none = await request(app).get(ME);
    const bad = await request(app).get(ME).set(bearer('not-a-jwt'));
    const old = await request(app).get(ME).set(bearer(expired));

    expect(bad.body).toEqual(none.body);
    expect(old.body).toEqual(none.body);
  });
});

describe('#5 管理員 API 只允許 admin', () => {
  test('一般會員呼叫：回應 403', async () => {
    const { token } = await createUserWithToken();

    const res = await request(app).get('/test/admin-only').set(bearer(token));

    expect(res.status).toBe(403);
    expect(res.body.status).toBe('failed');
  });

  test('管理員呼叫：通過檢查', async () => {
    const { user, token } = await createUserWithToken({ email: 'admin@example.com', role: 'admin' });

    const res = await request(app).get('/test/admin-only').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  test('未登入呼叫：回應 401（不是 403）', async () => {
    const res = await request(app).get('/test/admin-only');

    expect(res.status).toBe(401);
  });

  test('權限以資料庫為準：Token 內自行宣告 role 無效', async () => {
    const { user } = await createUserWithToken();
    const selfPromoted = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
      subject: String(user.id),
      expiresIn: '1h',
    });

    const res = await request(app).get('/test/admin-only').set(bearer(selfPromoted));

    expect(res.status).toBe(403);
  });

  test('管理員被降為一般會員後，原本的 Token 立即失去權限', async () => {
    const { user, token } = await createUserWithToken({ email: 'admin@example.com', role: 'admin' });
    await dataSource.getRepository(User).update({ id: user.id }, { role: 'member' });

    const res = await request(app).get('/test/admin-only').set(bearer(token));

    expect(res.status).toBe(403);
  });
});

describe('#5 管理員只能由 seed 產生', () => {
  const { seedAdmin } = require('../src/seeds/admin.seed');
  const admin = { email: 'Admin@Example.com', password: 'admin-password-1', name: '店長' };

  test('執行 seed：建立 role 為 admin 的帳號，可用來登入', async () => {
    await seedAdmin(dataSource, admin);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: admin.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  test('重複執行：不會產生第二筆，並以最新的密碼為準', async () => {
    await seedAdmin(dataSource, admin);
    await seedAdmin(dataSource, { ...admin, password: 'admin-password-2' });

    const users = await dataSource.getRepository(User).find();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin-password-2' });

    expect(users).toHaveLength(1);
    expect(users[0].role).toBe('admin');
    expect(res.status).toBe(200);
  });

  test('設定不完整或不合法：中止且不建立帳號', async () => {
    await expect(seedAdmin(dataSource, { email: 'admin@example.com', name: '店長' })).rejects.toThrow();
    await expect(seedAdmin(dataSource, { ...admin, password: 'short' })).rejects.toThrow();

    await expect(dataSource.getRepository(User).count()).resolves.toBe(0);
  });

  test('系統沒有任何修改 role 的 API', async () => {
    const { user, token } = await createUserWithToken();

    const attempts = await Promise.all([
      request(app).patch(ME).set(bearer(token)).send({ role: 'admin' }),
      request(app).put(ME).set(bearer(token)).send({ role: 'admin' }),
      request(app).patch(`/api/v1/users/${user.id}`).set(bearer(token)).send({ role: 'admin' }),
    ]);
    const saved = await dataSource.getRepository(User).findOneBy({ id: user.id });

    expect(attempts.map((r) => r.status)).toEqual([404, 404, 404]);
    expect(saved.role).toBe('member');
  });
});
