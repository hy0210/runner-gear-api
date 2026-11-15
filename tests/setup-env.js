// 測試用環境變數。只在 Jest 執行時載入，不讀取 .env。
process.env.NODE_ENV = 'test';
process.env.PORT ??= '3000';

// 測試資料庫連線（CI 使用 workflow 內的 postgres service；本機可用環境變數覆寫）。
// 這些是測試專用的預設值，不是機密。
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USERNAME ??= 'postgres';
process.env.DB_PASSWORD ??= 'postgres';
process.env.DB_DATABASE ??= 'runner_gear_test';

// 允許跨來源請求的前端網址（逗號分隔）
process.env.CORS_ORIGINS ??= 'http://localhost:5173';

// JWT 測試用密鑰：執行時組出來的固定字串，僅供測試
process.env.JWT_SECRET ??= 'test-only-'.repeat(4);
process.env.JWT_EXPIRES_IN ??= '1h';

// 模擬正式環境在 CloudFront 後方的設定（信任一層代理）
process.env.TRUST_PROXY ??= '1';
