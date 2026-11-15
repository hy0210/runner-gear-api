const request = require('supertest');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase, truncateAll } = require('./helpers/db');
const { createCategory, createProduct } = require('./helpers/catalog');

const PRODUCTS = '/api/v1/products';
const app = createTestApp();

let shoes;
let apparel;

beforeAll(resetDatabase);
afterAll(closeDatabase);
beforeEach(async () => {
  await truncateAll();
  shoes = await createCategory('跑鞋');
  apparel = await createCategory('服飾');
  // 跑鞋 5 筆、服飾 2 筆
  for (let i = 1; i <= 5; i += 1) {
    await createProduct(shoes.id, { name: `Swift ${i} 競速跑鞋`, price: 3000 + i });
  }
  await createProduct(apparel.id, { name: '透氣排汗短袖', price: 890 });
  await createProduct(apparel.id, { name: 'SWIFT 風衣外套', price: 2480 });
});

describe('#6 任何人可瀏覽商品列表', () => {
  test('不需登入；預設回傳第一頁與分頁資訊', async () => {
    const res = await request(app).get(PRODUCTS);

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(7);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 12, total: 7, totalPages: 1 });
    expect(res.body.data.products[0]).toEqual({
      id: expect.any(Number),
      name: 'Swift 1 競速跑鞋',
      description: '日常訓練用',
      price: 3001,
      imageUrl: 'https://example.com/shoe.png',
      category: { id: shoes.id, name: '跑鞋' },
    });
  });

  test('分頁：以 page、limit 查詢，回應該頁商品與分頁資訊', async () => {
    const page2 = await request(app).get(`${PRODUCTS}?page=2&limit=3`);
    const page3 = await request(app).get(`${PRODUCTS}?page=3&limit=3`);
    const beyond = await request(app).get(`${PRODUCTS}?page=9&limit=3`);

    expect(page2.body.data.products.map((p) => p.name)).toEqual([
      'Swift 4 競速跑鞋',
      'Swift 5 競速跑鞋',
      '透氣排汗短袖',
    ]);
    expect(page2.body.data.pagination).toEqual({ page: 2, limit: 3, total: 7, totalPages: 3 });
    expect(page3.body.data.products).toHaveLength(1);
    expect(beyond.status).toBe(200);
    expect(beyond.body.data.products).toEqual([]);
  });

  test('分類篩選：只回傳該分類的商品', async () => {
    const res = await request(app).get(`${PRODUCTS}?categoryId=${apparel.id}`);

    expect(res.body.data.products.map((p) => p.name)).toEqual(['透氣排汗短袖', 'SWIFT 風衣外套']);
    expect(res.body.data.pagination.total).toBe(2);
  });

  test('關鍵字搜尋：名稱包含關鍵字，不分大小寫', async () => {
    const res = await request(app).get(`${PRODUCTS}?keyword=swift`);

    expect(res.body.data.pagination.total).toBe(6);
  });

  test('分類、關鍵字與分頁可同時使用', async () => {
    const res = await request(app).get(
      `${PRODUCTS}?categoryId=${shoes.id}&keyword=${encodeURIComponent('競速')}&page=2&limit=2`,
    );

    expect(res.body.data.products.map((p) => p.name)).toEqual(['Swift 3 競速跑鞋', 'Swift 4 競速跑鞋']);
    expect(res.body.data.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  test('關鍵字中的 % 與 _ 視為一般字元，不是萬用字元', async () => {
    const percent = await request(app).get(`${PRODUCTS}?keyword=${encodeURIComponent('%')}`);
    const underscore = await request(app).get(`${PRODUCTS}?keyword=_`);

    expect(percent.body.data.pagination.total).toBe(0);
    expect(underscore.body.data.pagination.total).toBe(0);
  });

  test('查無結果：回應 200 與空陣列', async () => {
    const res = await request(app).get(`${PRODUCTS}?keyword=${encodeURIComponent('不存在的商品')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([]);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 12, total: 0, totalPages: 0 });
  });

  test.each([
    ['page 不是正整數', 'page=0'],
    ['page 不是數字', 'page=abc'],
    ['limit 是小數', 'limit=1.5'],
    ['limit 超過 50', 'limit=51'],
    ['categoryId 不是正整數', 'categoryId=-1'],
    ['keyword 超過 50 個字元', `keyword=${'a'.repeat(51)}`],
  ])('查詢參數不合法（%s）：回應 400', async (_label, query) => {
    const res = await request(app).get(`${PRODUCTS}?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('failed');
  });

  test('關鍵字含 SQL 片段：當成一般文字處理', async () => {
    const res = await request(app).get(`${PRODUCTS}?keyword=${encodeURIComponent("' OR 1=1 --")}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([]);
  });
});

describe('#6 任何人可查看單一商品與分類列表', () => {
  test('商品存在：回應 200 與商品資料（含分類）', async () => {
    const product = await createProduct(apparel.id, { name: '壓縮小腿套', price: 650 });

    const res = await request(app).get(`${PRODUCTS}/${product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.product).toMatchObject({
      id: product.id,
      name: '壓縮小腿套',
      price: 650,
      category: { id: apparel.id, name: '服飾' },
    });
  });

  test('商品不存在：回應 404', async () => {
    const res = await request(app).get(`${PRODUCTS}/99999`);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('failed');
  });

  test('id 不是正整數：回應 400', async () => {
    const res = await request(app).get(`${PRODUCTS}/abc`);

    expect(res.status).toBe(400);
  });

  test('分類列表：回應全部分類', async () => {
    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([
      { id: shoes.id, name: '跑鞋' },
      { id: apparel.id, name: '服飾' },
    ]);
  });
});
