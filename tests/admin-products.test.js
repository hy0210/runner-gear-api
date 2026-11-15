const request = require('supertest');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase, truncateAll, dataSource } = require('./helpers/db');
const { createCategory, createProduct } = require('./helpers/catalog');
const { createUserWithToken, bearer } = require('./helpers/users');
const { Product, CartItem } = require('../src/entities');

const ADMIN_PRODUCTS = '/api/v1/admin/products';
const app = createTestApp();

let admin;
let member;
let category;
const validBody = () => ({
  name: '  Aero 輕量跑鞋  ',
  description: '適合節奏跑',
  price: 3680,
  imageUrl: 'https://example.com/aero.png',
  categoryId: category.id,
});

beforeAll(resetDatabase);
afterAll(closeDatabase);
beforeEach(async () => {
  await truncateAll();
  admin = await createUserWithToken({ email: 'admin@example.com', role: 'admin' });
  member = await createUserWithToken({ email: 'member@example.com' });
  category = await createCategory('跑鞋');
});

describe('#7 管理員可管理商品', () => {
  test('新增成功：回應 201 與新商品', async () => {
    const res = await request(app).post(ADMIN_PRODUCTS).set(bearer(admin.token)).send(validBody());

    expect(res.status).toBe(201);
    expect(res.body.data.product).toEqual({
      id: expect.any(Number),
      name: 'Aero 輕量跑鞋',
      description: '適合節奏跑',
      price: 3680,
      imageUrl: 'https://example.com/aero.png',
      category: { id: category.id, name: '跑鞋' },
    });
    const listed = await request(app).get(`/api/v1/products/${res.body.data.product.id}`);
    expect(listed.status).toBe(200);
  });

  test('新增時多帶的欄位（id 等）會被忽略', async () => {
    const res = await request(app)
      .post(ADMIN_PRODUCTS)
      .set(bearer(admin.token))
      .send({ ...validBody(), id: 9999, createdAt: '2000-01-01' });

    expect(res.status).toBe(201);
    expect(res.body.data.product.id).not.toBe(9999);
  });

  test('編輯：可只送部分欄位，回應 200 與更新後資料', async () => {
    const product = await createProduct(category.id, { name: '舊名稱', price: 1000 });
    const other = await createCategory('配件');

    const res = await request(app)
      .patch(`${ADMIN_PRODUCTS}/${product.id}`)
      .set(bearer(admin.token))
      .send({ price: 1200, categoryId: other.id });

    expect(res.status).toBe(200);
    expect(res.body.data.product).toMatchObject({
      id: product.id,
      name: '舊名稱',
      price: 1200,
      category: { id: other.id, name: '配件' },
    });
  });

  test('刪除：回應 204，之後查詢該商品為 404，購物車中的項目一併移除', async () => {
    const product = await createProduct(category.id);
    await dataSource.getRepository(CartItem).save({ userId: member.user.id, productId: product.id, quantity: 1 });

    const res = await request(app).delete(`${ADMIN_PRODUCTS}/${product.id}`).set(bearer(admin.token));
    const after = await request(app).get(`/api/v1/products/${product.id}`);

    expect(res.status).toBe(204);
    expect(after.status).toBe(404);
    await expect(dataSource.getRepository(CartItem).count()).resolves.toBe(0);
  });

  test('目標不存在：編輯或刪除不存在的商品回應 404', async () => {
    const patch = await request(app).patch(`${ADMIN_PRODUCTS}/99999`).set(bearer(admin.token)).send({ price: 1 });
    const del = await request(app).delete(`${ADMIN_PRODUCTS}/99999`).set(bearer(admin.token));

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
  });

  test('指定不存在的分類：回應 400，資料不變', async () => {
    const product = await createProduct(category.id);

    const create = await request(app)
      .post(ADMIN_PRODUCTS)
      .set(bearer(admin.token))
      .send({ ...validBody(), categoryId: 99999 });
    const patch = await request(app)
      .patch(`${ADMIN_PRODUCTS}/${product.id}`)
      .set(bearer(admin.token))
      .send({ categoryId: 99999 });

    expect(create.status).toBe(400);
    expect(patch.status).toBe(400);
    await expect(dataSource.getRepository(Product).count()).resolves.toBe(1);
  });
});

describe('#7 輸入需通過驗證', () => {
  test.each([
    ['名稱為空', { name: '   ' }, 'name'],
    ['名稱含 NUL 字元', { name: 'a\u0000b' }, 'name'],
    ['描述含 NUL 字元', { description: 'a\u0000b' }, 'description'],
    ['價格為負', { price: -1 }, 'price'],
    ['價格是小數', { price: 99.5 }, 'price'],
    ['價格是字串', { price: '100' }, 'price'],
    ['價格過大', { price: 10000001 }, 'price'],
    ['圖片網址不是 http(s)', { imageUrl: 'javascript:alert(1)' }, 'imageUrl'],
    ['圖片網址不是網址', { imageUrl: 'not-a-url' }, 'imageUrl'],
  ])('資料不合法（%s）：新增與編輯都回應 400，資料不變', async (_label, override, field) => {
    const product = await createProduct(category.id, { name: '原商品', price: 500 });

    const create = await request(app)
      .post(ADMIN_PRODUCTS)
      .set(bearer(admin.token))
      .send({ ...validBody(), ...override });
    const patch = await request(app)
      .patch(`${ADMIN_PRODUCTS}/${product.id}`)
      .set(bearer(admin.token))
      .send(override);

    expect(create.status).toBe(400);
    expect(create.body.errors.map((e) => e.field)).toContain(field);
    expect(patch.status).toBe(400);
    const saved = await dataSource.getRepository(Product).find();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: '原商品', price: 500 });
  });

  test('新增時缺少必填欄位：回應 400', async () => {
    const res = await request(app).post(ADMIN_PRODUCTS).set(bearer(admin.token)).send({ name: '只有名稱' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field).sort()).toEqual(['categoryId', 'imageUrl', 'price']);
  });

  test('編輯時沒有送任何可更新的欄位：回應 400', async () => {
    const product = await createProduct(category.id);

    const res = await request(app)
      .patch(`${ADMIN_PRODUCTS}/${product.id}`)
      .set(bearer(admin.token))
      .send({ unknown: 'x' });

    expect(res.status).toBe(400);
  });
});

describe('#7 只有管理員可以呼叫', () => {
  test('未登入：回應 401，資料不變', async () => {
    const product = await createProduct(category.id);

    const results = await Promise.all([
      request(app).post(ADMIN_PRODUCTS).send(validBody()),
      request(app).patch(`${ADMIN_PRODUCTS}/${product.id}`).send({ price: 1 }),
      request(app).delete(`${ADMIN_PRODUCTS}/${product.id}`),
    ]);

    expect(results.map((r) => r.status)).toEqual([401, 401, 401]);
    await expect(dataSource.getRepository(Product).count()).resolves.toBe(1);
  });

  test('一般會員：回應 403，資料不變', async () => {
    const product = await createProduct(category.id, { price: 500 });

    const results = await Promise.all([
      request(app).post(ADMIN_PRODUCTS).set(bearer(member.token)).send(validBody()),
      request(app).patch(`${ADMIN_PRODUCTS}/${product.id}`).set(bearer(member.token)).send({ price: 1 }),
      request(app).delete(`${ADMIN_PRODUCTS}/${product.id}`).set(bearer(member.token)),
    ]);
    const saved = await dataSource.getRepository(Product).find();

    expect(results.map((r) => r.status)).toEqual([403, 403, 403]);
    expect(saved).toHaveLength(1);
    expect(saved[0].price).toBe(500);
  });
});
