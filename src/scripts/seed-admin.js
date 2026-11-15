// 用法：設定 ADMIN_EMAIL、ADMIN_PASSWORD、ADMIN_NAME 後執行 `npm run seed:admin`
const dataSource = require('../config/data-source');
const { seedAdmin } = require('../seeds/admin.seed');

async function main() {
  await dataSource.initialize();
  try {
    const result = await seedAdmin(dataSource, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME,
    });
    // 不印出密碼
    console.log(`管理員帳號已${result.created ? '建立' : '更新'}：${result.email}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(`管理員 seed 失敗：${error.message}`);
  process.exit(1);
});
