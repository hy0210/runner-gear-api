const request = require('supertest');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase, truncateAll, dataSource } = require('./helpers/db');
const { createCategory, createProduct } = require('./helpers/catalog');
const { createUserWithToken, bearer } = require('./helpers/users');
const { CartItem } = require('../src/entities');

const CART = '/api/v1/cart';
const ITEMS = '/api/v1/cart/items';
const app = createTestApp();

let alice;
let bob;
let shoe;
let sock;

const addItem = (user, body) => request(app).post(ITEMS).set(bearer(user.token)).send(body);
const getCart = (user) => request(app).get(CART).set(bearer(user.token));

beforeAll(resetDatabase);
afterAll(closeDatabase);
beforeEach(async () => {
  await truncateAll();
  alice = await createUserWithToken({ email: 'alice@example.com' });
  bob = await createUserWithToken({ email: 'bob@example.com' });
  const category = await createCategory('跑鞋');
  shoe = await createProduct(category.id, { name: '競速跑鞋', price: 3000 });
  sock = await createProduct(category.id, { name: '五趾襪', price: 250 });
});

describe('#8 會員可查看與加入購物車', () => {
  test('空購物車：回應 200 與空的項目', async () => {
    const res = await getCart(alice);

    expect(res.status).toBe(200);
    expect(res.body.data.cart).toEqual({ items: [], totalQuantity: 0, totalPrice: 0 });
  });

  test('加入商品：回應 201 與最新的完整購物車（項目、小計、總金額）', async () => {
    await addItem(alice, { productId: shoe.id, quantity: 2 });
    const res = await addItem(alice, { productId: sock.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.cart).toEqual({
      items: [
        {
          id: expect.any(Number),
          quantity: 2,
          subtotal: 6000,
          product: { id: shoe.id, name: '競速跑鞋', price: 3000, imageUrl: 'https://example.com/shoe.png' },
        },
        {
          id: expect.any(Number),
          quantity: 3,
          subtotal: 750,
          product: { id: sock.id, name: '五趾襪', price: 250, imageUrl: 'https://example.com/shoe.png' },
        },
      ],
      totalQuantity: 5,
      totalPrice: 6750,
    });
  });

  test('重複加入同一商品：數量累加，不產生第二筆', async () => {
    await addItem(alice, { productId: shoe.id, quantity: 2 });
    const res = await addItem(alice, { productId: shoe.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.cart.items).toHaveLength(1);
    expect(res.body.data.cart.items[0].quantity).toBe(5);
    await expect(dataSource.getRepository(CartItem).count()).resolves.toBe(1);
  });

  test('同時送出兩個加入請求：數量正確累加', async () => {
    await Promise.all([
      addItem(alice, { productId: shoe.id, quantity: 1 }),
      addItem(alice, { productId: shoe.id, quantity: 1 }),
    ]);

    const res = await getCart(alice);

    expect(res.body.data.cart.items).toHaveLength(1);
    expect(res.body.data.cart.items[0].quantity).toBe(2);
  });

  test('商品不存在：回應 404', async () => {
    const res = await addItem(alice, { productId: 99999, quantity: 1 });

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('failed');
  });

  test.each([
    ['0', 0],
    ['負數', -1],
    ['小數', 1.5],
    ['字串', '2'],
    ['超過 99', 100],
    ['null', null],
  ])('數量不合法（%s）：回應 400，購物車不變', async (_label, quantity) => {
    await addItem(alice, { productId: shoe.id, quantity: 1 });

    const res = await addItem(alice, { productId: shoe.id, quantity });
    const cart = await getCart(alice);

    expect(res.status).toBe(400);
    expect(cart.body.data.cart.items[0].quantity).toBe(1);
  });

  test('缺少 quantity 或 productId：回應 400', async () => {
    const noQuantity = await addItem(alice, { productId: shoe.id });
    const noProduct = await addItem(alice, { quantity: 1 });

    expect(noQuantity.status).toBe(400);
    expect(noProduct.status).toBe(400);
  });

  test('累加後超過單一商品上限 99：回應 400，數量不變', async () => {
    await addItem(alice, { productId: shoe.id, quantity: 60 });

    const res = await addItem(alice, { productId: shoe.id, quantity: 40 });
    const cart = await getCart(alice);

    expect(res.status).toBe(400);
    expect(cart.body.data.cart.items[0].quantity).toBe(60);
  });
});

describe('#8 會員可調整數量與移除項目', () => {
  test('調整數量：回應 200 與最新購物車', async () => {
    const added = await addItem(alice, { productId: shoe.id, quantity: 1 });
    const itemId = added.body.data.cart.items[0].id;

    const res = await request(app).patch(`${ITEMS}/${itemId}`).set(bearer(alice.token)).send({ quantity: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data.cart.items[0]).toMatchObject({ id: itemId, quantity: 4, subtotal: 12000 });
    expect(res.body.data.cart.totalPrice).toBe(12000);
  });

  test.each([0, -1, 1.5, '3', 100])('調整為不合法的數量（%p）：回應 400，數量不變', async (quantity) => {
    const added = await addItem(alice, { productId: shoe.id, quantity: 2 });
    const itemId = added.body.data.cart.items[0].id;

    const res = await request(app).patch(`${ITEMS}/${itemId}`).set(bearer(alice.token)).send({ quantity });
    const cart = await getCart(alice);

    expect(res.status).toBe(400);
    expect(cart.body.data.cart.items[0].quantity).toBe(2);
  });

  test('移除項目：回應 200 與最新購物車，該項目已不存在', async () => {
    await addItem(alice, { productId: shoe.id, quantity: 1 });
    const added = await addItem(alice, { productId: sock.id, quantity: 2 });
    const sockItem = added.body.data.cart.items.find((item) => item.product.id === sock.id);

    const res = await request(app).delete(`${ITEMS}/${sockItem.id}`).set(bearer(alice.token));

    expect(res.status).toBe(200);
    expect(res.body.data.cart.items.map((item) => item.product.id)).toEqual([shoe.id]);
    expect(res.body.data.cart.totalPrice).toBe(3000);
  });

  test('項目不存在或 id 不合法：分別回應 404、400', async () => {
    const missing = await request(app).patch(`${ITEMS}/99999`).set(bearer(alice.token)).send({ quantity: 1 });
    const invalid = await request(app).delete(`${ITEMS}/abc`).set(bearer(alice.token));

    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(400);
  });
});

describe('#8 購物車僅限本人操作', () => {
  test('未登入：任一購物車 API 都回應 401', async () => {
    const results = await Promise.all([
      request(app).get(CART),
      request(app).post(ITEMS).send({ productId: shoe.id, quantity: 1 }),
      request(app).patch(`${ITEMS}/1`).send({ quantity: 1 }),
      request(app).delete(`${ITEMS}/1`),
    ]);

    expect(results.map((r) => r.status)).toEqual([401, 401, 401, 401]);
  });

  test('每位會員只看得到自己的購物車', async () => {
    await addItem(alice, { productId: shoe.id, quantity: 2 });
    await addItem(bob, { productId: sock.id, quantity: 1 });

    const aliceCart = await getCart(alice);
    const bobCart = await getCart(bob);

    expect(aliceCart.body.data.cart.items.map((i) => i.product.id)).toEqual([shoe.id]);
    expect(bobCart.body.data.cart.items.map((i) => i.product.id)).toEqual([sock.id]);
  });

  test('操作他人的購物車項目：回應 404，對方的購物車不變', async () => {
    const added = await addItem(bob, { productId: shoe.id, quantity: 2 });
    const bobItemId = added.body.data.cart.items[0].id;

    const patch = await request(app).patch(`${ITEMS}/${bobItemId}`).set(bearer(alice.token)).send({ quantity: 9 });
    const del = await request(app).delete(`${ITEMS}/${bobItemId}`).set(bearer(alice.token));
    const bobCart = await getCart(bob);

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
    expect(bobCart.body.data.cart.items).toHaveLength(1);
    expect(bobCart.body.data.cart.items[0].quantity).toBe(2);
  });

  test('請求中夾帶 userId：仍只會寫入自己的購物車', async () => {
    await addItem(alice, { productId: shoe.id, quantity: 1, userId: bob.user.id });

    const aliceCart = await getCart(alice);
    const bobCart = await getCart(bob);

    expect(aliceCart.body.data.cart.items).toHaveLength(1);
    expect(bobCart.body.data.cart.items).toEqual([]);
  });
});
