// 用法：node src/scripts/migrate.js        套用尚未執行的 migration
//       node src/scripts/migrate.js revert 還原最後一次 migration
const dataSource = require('../config/data-source');

async function main() {
  const action = process.argv[2] ?? 'run';
  await dataSource.initialize();
  try {
    if (action === 'revert') {
      await dataSource.undoLastMigration();
      console.log('已還原最後一次 migration');
    } else {
      const executed = await dataSource.runMigrations();
      console.log(`已套用 ${executed.length} 個 migration`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  // 只印出訊息，避免把連線設定帶進記錄
  console.error(`migration 失敗：${error.message}`);
  process.exit(1);
});
