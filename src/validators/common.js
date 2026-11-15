const { z } = require('zod');

// 路徑與查詢字串中的正整數（資料庫 id、頁碼）。只接受純數字，上限在 PostgreSQL integer 範圍內。
const positiveIntString = (label) =>
  z
    .string()
    .regex(/^[1-9]\d{0,8}$/, `${label} 必須是正整數`)
    .transform(Number);

const idParamSchema = (name = 'id') => z.object({ [name]: positiveIntString(name) });

module.exports = { positiveIntString, idParamSchema };
