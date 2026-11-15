const { USER_ROLES } = require('../entities');
const { parseAccount, upsertAccount } = require('./account');

// 建立（或更新）管理員帳號。seed 是系統中唯一能產生 admin 的途徑。
// 重複執行不會產生第二筆；email 已被一般會員註冊時中止，不升級該帳號。
async function seedAdmin(dataSource, input) {
  const account = parseAccount(input, '管理員');
  return upsertAccount(dataSource, account, USER_ROLES.ADMIN);
}

module.exports = { seedAdmin };
