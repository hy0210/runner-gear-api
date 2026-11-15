const { Category, Product, USER_ROLES } = require('../entities');
const { parseAccount, upsertAccount } = require('./account');
const { categories } = require('./demo-data');

// 建立展示資料：分類、商品、一般會員與管理員測試帳號。可重複執行。
// 每次執行都會清空並重建分類與商品（購物車內容也會一併清空），用來把被改動的資料還原；
// 其他已註冊的會員不受影響。全部在同一個交易中完成，任何一步失敗就整個還原。
async function seedDemo(dataSource, input = {}) {
  // 先檢查帳號設定，有問題就不動資料庫
  const member = parseAccount(input.member, '一般會員測試帳號');
  const admin = parseAccount(input.admin, '管理員');
  if (member.email === admin.email) {
    throw new Error('一般會員與管理員的測試帳號不可使用同一個 email');
  }

  return dataSource.transaction(async (manager) => {
    // RESTART IDENTITY 讓每次重建後的 id 都相同
    await manager.query('TRUNCATE TABLE "cart_items", "products", "categories" RESTART IDENTITY CASCADE');

    let productCount = 0;
    for (const category of categories) {
      const savedCategory = await manager.getRepository(Category).save({ name: category.name });
      await manager
        .getRepository(Product)
        .insert(category.products.map((product) => ({ ...product, categoryId: savedCategory.id })));
      productCount += category.products.length;
    }

    const memberResult = await upsertAccount(manager, member, USER_ROLES.MEMBER);
    const adminResult = await upsertAccount(manager, admin, USER_ROLES.ADMIN);

    return {
      categories: categories.length,
      products: productCount,
      member: memberResult.email,
      admin: adminResult.email,
    };
  });
}

module.exports = { seedDemo };
