const dataSource = require('../../src/config/data-source');

// 清空測試資料庫並重新套用全部 migration，讓每個測試檔從乾淨的結構開始。
async function resetDatabase() {
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
