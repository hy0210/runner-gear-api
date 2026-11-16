const { resetDatabase, closeDatabase, truncateAll, dataSource } = require('./helpers/db');
const { User, Category, Product, CartItem } = require('../src/entities');

// PostgreSQL 的錯誤代碼
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const NOT_NULL_VIOLATION = '23502';
const CHECK_VIOLATION = '23514';
// PostgreSQL 18 起，ON DELETE RESTRICT 被擋下時改用 restrict_violation（23001）；
// 16、17 仍是 23503。兩者都代表「刪除被拒絕」，所以測試接受任一個。
const RESTRICT_VIOLATION = '23001';

// 可接受多個錯誤代碼：只要其中一個相符就算通過。
async function expectDbError(promise, ...acceptedCodes) {
  const error = await promise.then(
    () => null,
    (caught) => caught,
  );

  expect(error).not.toBeNull();
  expect(acceptedCodes).toContain(error.driverError?.code ?? error.code);
}

async function createUser(overrides = {}) {
  return dataSource.getRepository(User).save({
    email: 'runner@example.com',
    password: 'hashed-password',
    name: '跑者',
    ...overrides,
  });
}

async function createCategory(name = '跑鞋') {
  return dataSource.getRepository(Category).save({ name });
}

async function createProduct(categoryId, overrides = {}) {
  return dataSource.getRepository(Product).save({
    name: '輕量訓練跑鞋',
    price: 3200,
    imageUrl: 'https://example.com/shoe.png',
    categoryId,
    ...overrides,
  });
}

describe('#2 資料庫結構與約束', () => {
  beforeAll(resetDatabase);
  beforeEach(truncateAll);
  afterAll(closeDatabase);

  describe('migration', () => {
    test('migration 套用後的結構與 entity 定義一致', async () => {
      const pending = await dataSource.driver.createSchemaBuilder().log();

      expect(pending.upQueries.map((q) => q.query)).toEqual([]);
    });

    test('migration 可以還原再重新套用', async () => {
      await dataSource.undoLastMigration();
      const tables = await dataSource.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name IN ('users', 'categories', 'products', 'cart_items')`,
      );
      expect(tables).toEqual([]);

      await dataSource.runMigrations();
      await expect(createCategory()).resolves.toMatchObject({ id: expect.any(Number) });
    });
  });

  describe('資料表具備完整約束', () => {
    test('email 重複：unique 約束拒絕', async () => {
      await createUser();

      await expectDbError(createUser({ name: '另一位跑者' }), UNIQUE_VIOLATION);
    });

    test('商品指向不存在的分類：外鍵約束拒絕', async () => {
      await expectDbError(createProduct(9999), FOREIGN_KEY_VIOLATION);
    });

    test('價格為負：check 約束拒絕', async () => {
      const category = await createCategory();

      await expectDbError(createProduct(category.id, { price: -1 }), CHECK_VIOLATION);
    });

    test('購物車數量小於 1：check 約束拒絕', async () => {
      const user = await createUser();
      const category = await createCategory();
      const product = await createProduct(category.id);

      await expectDbError(
        dataSource.getRepository(CartItem).save({ userId: user.id, productId: product.id, quantity: 0 }),
        CHECK_VIOLATION,
      );
    });

    test('role 不是 member 或 admin：check 約束拒絕', async () => {
      await expectDbError(createUser({ role: 'superuser' }), CHECK_VIOLATION);
    });

    test('必填欄位為空：非空約束拒絕', async () => {
      await expectDbError(
        dataSource.query(`INSERT INTO "users" ("email", "password") VALUES ($1, $2)`, ['a@example.com', 'x']),
        NOT_NULL_VIOLATION,
      );
    });

    test('role 預設為 member，密碼欄位預設不被查詢帶出', async () => {
      await createUser();

      const found = await dataSource.getRepository(User).findOneBy({ email: 'runner@example.com' });

      expect(found.role).toBe('member');
      expect(found).not.toHaveProperty('password');
    });
  });

  describe('同一會員的同一商品只有一筆購物車項目', () => {
    test('重複寫入：unique 約束拒絕', async () => {
      const user = await createUser();
      const category = await createCategory();
      const product = await createProduct(category.id);
      const repo = dataSource.getRepository(CartItem);
      await repo.save({ userId: user.id, productId: product.id, quantity: 1 });

      await expectDbError(
        repo.insert({ userId: user.id, productId: product.id, quantity: 2 }),
        UNIQUE_VIOLATION,
      );
    });
  });

  describe('刪除時維持關聯一致', () => {
    test('刪除商品：相關購物車項目一併刪除', async () => {
      const user = await createUser();
      const category = await createCategory();
      const product = await createProduct(category.id);
      await dataSource.getRepository(CartItem).save({ userId: user.id, productId: product.id, quantity: 2 });

      await dataSource.getRepository(Product).delete({ id: product.id });

      await expect(dataSource.getRepository(CartItem).count()).resolves.toBe(0);
    });

    test('刪除仍有商品的分類：外鍵約束拒絕', async () => {
      const category = await createCategory();
      await createProduct(category.id);

      await expectDbError(
        dataSource.getRepository(Category).delete({ id: category.id }),
        RESTRICT_VIOLATION,
        FOREIGN_KEY_VIOLATION,
      );
    });
  });
});
