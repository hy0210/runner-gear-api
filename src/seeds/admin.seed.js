const { z } = require('zod');
const { User, USER_ROLES } = require('../entities');
const { hashPassword } = require('../utils/password');

const adminSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(50),
});

// 建立（或更新）管理員帳號。這是系統中唯一能產生 admin 的途徑。
// 重複執行不會產生第二筆；已存在時以這次提供的姓名與密碼為準。
async function seedAdmin(dataSource, input) {
  const parsed = adminSchema.safeParse(input ?? {});
  if (!parsed.success) {
    // 只說明哪個欄位有問題，不印出值
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`管理員設定不完整或不合法：${fields.join('、')}`);
  }

  const { email, password, name } = parsed.data;
  const repository = dataSource.getRepository(User);
  const hashed = await hashPassword(password);
  const existing = await repository.findOneBy({ email });

  if (existing) {
    await repository.update({ id: existing.id }, { name, password: hashed, role: USER_ROLES.ADMIN });
    return { id: existing.id, email, created: false };
  }

  const created = await repository.save({ email, name, password: hashed, role: USER_ROLES.ADMIN });
  return { id: created.id, email, created: true };
}

module.exports = { seedAdmin };
