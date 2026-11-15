const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const createApp = require('../src/app');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase, truncateAll, dataSource } = require('./helpers/db');
const { User } = require('../src/entities');

const REGISTER = '/api/v1/auth/register';
const LOGIN = '/api/v1/auth/login';
const validUser = { email: 'runner@example.com', password: 'password123', name: '小跑' };

const app = createTestApp();

function findUserWithPassword(email) {
  return dataSource
    .getRepository(User)
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.email = :email', { email })
    .getOne();
}

beforeAll(resetDatabase);
beforeEach(truncateAll);
afterAll(closeDatabase);

describe('#4 訪客可註冊為一般會員', () => {
  test('註冊成功：回應 201、會員資料與 JWT，且不含密碼欄位', async () => {
    const res = await request(app).post(REGISTER).send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user).toEqual({
      id: expect.any(Number),
      email: 'runner@example.com',
      name: '小跑',
      role: 'member',
    });
    expect(typeof res.body.data.token).toBe('string');
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('密碼以 bcrypt 雜湊儲存，不是明文', async () => {
    await request(app).post(REGISTER).send(validUser);

    const saved = await findUserWithPassword(validUser.email);

    expect(saved.password).not.toBe(validUser.password);
    expect(saved.password).toMatch(/^\$2[aby]\$/);
    await expect(bcrypt.compare(validUser.password, saved.password)).resolves.toBe(true);
  });

  test('JWT 有期限，內容不含 email、角色或密碼', async () => {
    const res = await request(app).post(REGISTER).send(validUser);

    const payload = jwt.decode(res.body.data.token);

    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
  });

  test('註冊時夾帶 role：註冊成功但 role 仍為 member', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ ...validUser, role: 'admin', id: 999 });

    const saved = await dataSource.getRepository(User).findOneBy({ email: validUser.email });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('member');
    expect(saved.role).toBe('member');
    expect(saved.id).not.toBe(999);
  });

  test.each([
    ['email 格式錯誤', { ...validUser, email: 'not-an-email' }, 'email'],
    ['密碼少於 8 碼', { ...validUser, password: '1234567' }, 'password'],
    ['缺少 name', { email: validUser.email, password: validUser.password }, 'name'],
    ['name 只有空白', { ...validUser, name: '   ' }, 'name'],
  ])('資料不合法（%s）：回應 400，不建立會員', async (_label, body, field) => {
    const res = await request(app).post(REGISTER).send(body);

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('failed');
    expect(res.body.errors.map((e) => e.field)).toContain(field);
    await expect(dataSource.getRepository(User).count()).resolves.toBe(0);
  });

  test('email 已被使用（大小寫不同也算）：回應 409，不建立第二筆', async () => {
    await request(app).post(REGISTER).send(validUser);

    const res = await request(app)
      .post(REGISTER)
      .send({ ...validUser, email: 'Runner@Example.com' });

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('failed');
    await expect(dataSource.getRepository(User).count()).resolves.toBe(1);
  });
});

describe('#4 會員可登入取得 JWT', () => {
  beforeEach(async () => {
    await request(app).post(REGISTER).send(validUser);
  });

  test('登入成功：回應 200、會員資料與有期限的 JWT', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: ' Runner@Example.com ', password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: validUser.email, role: 'member' });
    expect(jwt.decode(res.body.data.token).exp).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('帳號不存在與密碼錯誤：都回應 401 與同一句訊息', async () => {
    const wrongPassword = await request(app)
      .post(LOGIN)
      .send({ email: validUser.email, password: 'wrong-password' });
    const noSuchUser = await request(app)
      .post(LOGIN)
      .send({ email: 'nobody@example.com', password: validUser.password });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect(wrongPassword.body).toEqual(noSuchUser.body);
    expect(wrongPassword.body.data).toBeUndefined();
  });

  test('缺少欄位：回應 400', async () => {
    const res = await request(app).post(LOGIN).send({ email: validUser.email });

    expect(res.status).toBe(400);
  });
});

describe('#4 註冊與登入有限流', () => {
  test('短時間內超過次數上限：回應 429', async () => {
    const limited = createApp({ authRateLimitMax: 3 });
    const attempt = () => request(limited).post(LOGIN).send({ email: 'a@example.com', password: 'x' });

    const first = [await attempt(), await attempt(), await attempt()];
    const blocked = await attempt();

    expect(first.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(blocked.status).toBe(429);
    expect(blocked.body.status).toBe('failed');
  });

  test('在反向代理後方：依轉送標頭中的用戶端位址分開計算', async () => {
    const limited = createApp({ authRateLimitMax: 1 });
    const attemptFrom = (ip) =>
      request(limited).post(LOGIN).set('X-Forwarded-For', ip).send({ email: 'a@example.com', password: 'x' });

    const firstClient = [await attemptFrom('203.0.113.10'), await attemptFrom('203.0.113.10')];
    const secondClient = await attemptFrom('203.0.113.20');

    expect(firstClient.map((r) => r.status)).toEqual([401, 429]);
    expect(secondClient.status).toBe(401);
  });

  test('限流不影響其他 API', async () => {
    const limited = createApp({ authRateLimitMax: 1 });
    await request(limited).post(LOGIN).send({ email: 'a@example.com', password: 'x' });
    await request(limited).post(LOGIN).send({ email: 'a@example.com', password: 'x' });

    const res = await request(limited).get('/health');

    expect(res.status).toBe(200);
  });
});
