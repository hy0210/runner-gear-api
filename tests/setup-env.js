// 測試用環境變數。只在 Jest 執行時載入，不讀取 .env。
process.env.NODE_ENV = 'test';
process.env.PORT ??= '3000';
