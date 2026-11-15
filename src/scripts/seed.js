// 用法：設定 MEMBER_* 與 ADMIN_* 六個環境變數後執行 `npm run seed`
// 注意：會清空並重建分類與商品，所有會員的購物車也會被清空。
const dataSource = require('../config/data-source');
const { seedDemo } = require('../seeds/demo.seed');

async function main() {
  await dataSource.initialize();
  try {
    const result = await seedDemo(dataSource, {
      member: {
        email: process.env.MEMBER_EMAIL,
        password: process.env.MEMBER_PASSWORD,
        name: process.env.MEMBER_NAME,
      },
      admin: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        name: process.env.ADMIN_NAME,
      },
    });
    // 不印出密碼
    console.log(
      `展示資料已重建：${result.categories} 個分類、${result.products} 筆商品；` +
        `一般會員 ${result.member}、管理員 ${result.admin}`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(`seed 失敗：${error.message}`);
  process.exit(1);
});
