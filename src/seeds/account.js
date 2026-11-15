const { z } = require('zod');
const { User, USER_ROLES } = require('../entities');
const { hashPassword } = require('../utils/password');

const accountSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(50),
});

// 驗證 seed 用的帳號設定。失敗時只說明哪個欄位有問題，不印出值。
function parseAccount(input, label) {
  const parsed = accountSchema.safeParse(input ?? {});
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`${label}設定不完整或不合法：${fields.join('、')}`);
  }
  return parsed.data;
}

// 建立或更新一個指定角色的帳號。manager 可以是 DataSource 或交易中的 EntityManager。
// 已存在且角色相同時，以這次提供的姓名與密碼為準；角色不同時中止，不變更既有帳號的角色：
// 否則搶先註冊管理員 email 的人，手上的舊 Token 會直接取得管理員權限。
async function upsertAccount(manager, account, role) {
  const repository = manager.getRepository(User);
  const hashed = await hashPassword(account.password);
  const existing = await repository.findOneBy({ email: account.email });

  if (existing && existing.role !== role) {
    const message =
      role === USER_ROLES.ADMIN
        ? '這個 email 已被一般會員註冊，無法設為管理員。請改用其他 email，或先刪除該會員帳號'
        : '這個 email 已是管理員帳號，無法作為一般會員測試帳號。請改用其他 email';
    throw new Error(message);
  }

  if (existing) {
    await repository.update({ id: existing.id }, { name: account.name, password: hashed });
    return { id: existing.id, email: account.email, created: false };
  }

  const created = await repository.save({ email: account.email, name: account.name, password: hashed, role });
  return { id: created.id, email: account.email, created: true };
}

module.exports = { parseAccount, upsertAccount };
