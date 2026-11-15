const createApp = require('../../src/app');

// 測試預設把註冊／登入的限流放寬，避免一般情境測試被 429 干擾；限流本身另有專門的測試。
function createTestApp(options = {}) {
  return createApp({ authRateLimitMax: 1000, ...options });
}

module.exports = { createTestApp };
