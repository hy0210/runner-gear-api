const dataSource = require('../../src/config/data-source');

// 清空測試資料庫並重新套用全部 migration，讓每個測試檔從乾淨的結構開始。
async function resetDatabase() {
  // 防呆：這個函式會清空整個資料庫，只允許對測試資料庫執行
  const { database } = dataSource.options;
  if (process.env.NODE_ENV !== 'test' || !String(database).endsWith('_test')) {
    throw new Error('拒絕清空資料庫：只能在 NODE_ENV=test 且資料庫名稱以 _test 結尾時執行');
  }
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  return dataSource;
}

async function closeDatabase() {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

// 清空所有資料表內容並重設流水號，結構不變。
async function truncateAll() {
  await dataSource.query(
    'TRUNCATE TABLE "cart_items", "products", "categories", "users" RESTART IDENTITY CASCADE',
  );
}

module.exports = { dataSource, resetDatabase, closeDatabase, truncateAll };
