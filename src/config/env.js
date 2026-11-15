const { z } = require('zod');
const { parseCorsOrigins } = require('./cors');

// 驗證訊息使用繁體中文
z.config(z.locales.zhTW());

// 測試環境的變數由 tests/setup-env.js 提供，不讀取 .env。
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ quiet: true });
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),

  // 允許跨來源請求的前端網址，以逗號分隔
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value, ctx) => {
      try {
        return parseCorsOrigins(value);
      } catch (error) {
        ctx.addIssue({ code: 'custom', message: error.message });
        return z.NEVER;
      }
    }),
});

const parsed = schema
  .refine((data) => data.NODE_ENV !== 'production' || data.CORS_ORIGINS.length > 0, {
    path: ['CORS_ORIGINS'],
    message: '正式環境必須設定至少一個前端來源',
  })
  .safeParse(process.env);

if (!parsed.success) {
  // 只印出變數名稱與原因，不印出值。
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`環境變數設定有誤：\n${problems.join('\n')}`);
}

module.exports = Object.freeze(parsed.data);
