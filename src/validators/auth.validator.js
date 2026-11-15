const { z } = require('zod');
const { NO_NUL } = require('./common');

// email 一律去除前後空白並轉小寫後再驗證、儲存與比對
const email = z
  .string({ error: '請輸入 email' })
  .trim()
  .toLowerCase()
  .max(255, 'email 長度不可超過 255 個字元')
  .pipe(z.email('email 格式不正確'));

// 只列出允許的欄位；多帶的 role、id 等欄位會被丟棄
const registerSchema = z.object({
  email,
  // bcrypt 只會使用前 72 個位元組，因此限制長度上限
  password: z
    .string({ error: '請輸入密碼' })
    .min(8, '密碼至少需要 8 個字元')
    .max(72, '密碼長度不可超過 72 個字元')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, '密碼長度超過上限'),
  name: z
    .string({ error: '請輸入姓名' })
    .trim()
    .min(1, '請輸入姓名')
    .max(50, '姓名長度不可超過 50 個字元')
    .refine(...NO_NUL),
});

const loginSchema = z.object({
  email,
  password: z.string({ error: '請輸入密碼' }).min(1, '請輸入密碼').max(72, '密碼長度超過上限'),
});

module.exports = { registerSchema, loginSchema };
