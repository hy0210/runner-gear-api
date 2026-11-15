const request = require('supertest');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase, truncateAll, dataSource } = require('./helpers/db');
const { createUserWithToken } = require('./helpers/users');
const { User, Category, Product, CartItem } = require('../src/entities');
const { seedDemo } = require('../src/seeds/demo.seed');

const app = createTestApp();
const accounts = {
  member: { email: 'member@example.com', password: 'member-pass-1', name: '測試會員' },
  admin: { email: 'admin@example.com', password: 'admin-pass-1', name: '測試管理員' },
};
const login = (account) =>
  request(app).post('/api/v1/auth/login').send({ email: account.email, password: account.password });

async function snapshot() {
  const products = await dataSource.getRepository(Product).find({ order: { id: 'ASC' } });
  const categories = await dataSource.getRepository(Category).find({ order: { id: 'ASC' } });
  return {
    categories: categories.map((c) => `${c.id}:${c.name}`),
    products: products.map((p) => `${p.id}:${p.name}:${p.price}:${p.categoryId}:${p.imageUrl}`),
  };
}

beforeAll(resetDatabase);
beforeEach(truncateAll);
afterAll(closeDatabase);

describe('#9 一個指令建立展示資料', () => {
  test('首次執行：5 個分類、至少 30 筆商品（每個分類至少 5 筆）、會員與管理員各一', async () => {
    await seedDemo(dataSource, accounts);

    const categories = await dataSource.getRepository(Category).find();
    const products = await dataSource.getRepository(Product).find();
    const perCategory = categories.map((c) => products.filter((p) => p.categoryId === c.id).length);
    const member = await login(accounts.member);
    const admin = await login(accounts.admin);

    expect(categories.map((c) => c.name)).toEqual(['跑鞋', '服飾', '配件', '補給', '電子裝置']);
    expect(products.length).toBeGreaterThanOrEqual(30);
    expect(Math.min(...perCategory)).toBeGreaterThanOrEqual(5);
    expect(member.body.data.user.role).toBe('member');
    expect(admin.body.data.user.role).toBe('admin');
    await expect(dataSource.getRepository(User).count()).resolves.toBe(2);
  });

  test('商品資料合理：名稱不重複、價格為正整數、圖片為 https 網址', async () => {
    await seedDemo(dataSource, accounts);

    const products = await dataSource.getRepository(Product).find();

    expect(new Set(products.map((p) => p.name)).size).toBe(products.length);
    for (const product of products) {
      expect(Number.isInteger(product.price) && product.price > 0).toBe(true);
      expect(product.imageUrl).toMatch(/^https:\/\//);
      expect(product.description.length).toBeGreaterThan(0);
    }
  });

  test('重複執行：分類與商品還原為初始內容，測試帳號不重複', async () => {
    await seedDemo(dataSource, accounts);
    const initial = await snapshot();
    const products = dataSource.getRepository(Product);
    const [first, second] = await products.find({ order: { id: 'ASC' }, take: 2 });
    await products.delete({ id: first.id });
    await products.update({ id: second.id }, { name: '被改掉的名稱', price: 1 });
    await products.save({ name: '被亂加的商品', price: 9, imageUrl: 'https://example.com/x.png', categoryId: second.categoryId });
    const member = await dataSource.getRepository(User).findOneBy({ email: accounts.member.email });
    await dataSource.getRepository(CartItem).save({ userId: member.id, productId: second.id, quantity: 3 });

    await seedDemo(dataSource, accounts);

    expect(await snapshot()).toEqual(initial);
    await expect(dataSource.getRepository(User).count()).resolves.toBe(2);
    await expect(dataSource.getRepository(CartItem).count()).resolves.toBe(0);
    expect((await login(accounts.member)).status).toBe(200);
  });

  test('重複執行不會刪除其他已註冊的會員', async () => {
    await seedDemo(dataSource, accounts);
    await createUserWithToken({ email: 'someone@example.com' });

    await seedDemo(dataSource, accounts);

    await expect(dataSource.getRepository(User).count()).resolves.toBe(3);
  });

  test.each([
    ['缺少會員帳號', { admin: accounts.admin }],
    ['缺少管理員密碼', { member: accounts.member, admin: { email: 'admin@example.com', name: '管理員' } }],
    ['兩個帳號用同一個 email', { member: accounts.member, admin: { ...accounts.admin, email: 'Member@example.com' } }],
  ])('帳號設定有問題（%s）：中止並說明原因，不建立半套資料', async (_label, input) => {
    await expect(seedDemo(dataSource, input)).rejects.toThrow();

    await expect(dataSource.getRepository(Category).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(Product).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(User).count()).resolves.toBe(0);
  });

  test('管理員 email 已被一般會員註冊：整個 seed 還原，不留下半套資料', async () => {
    await createUserWithToken({ email: accounts.admin.email });

    await expect(seedDemo(dataSource, accounts)).rejects.toThrow(/已被一般會員/);

    await expect(dataSource.getRepository(Category).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(User).count()).resolves.toBe(1);
  });
});
