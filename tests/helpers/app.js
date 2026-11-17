const createApp = require('../../src/app');

// 測試預設把各層限流放寬，避免一般情境測試被 429 干擾；限流本身另有專門的測試。
function createTestApp(options = {}) {
  return createApp({ authRateLimitMax: 1000, loginRateLimitMax: 1000, apiRateLimitMax: 100000, ...options });
}

module.exports = { createTestApp };
