const { rateLimit } = require('express-rate-limit');
const { sendFailed } = require('../utils/response');

const ONE_MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * ONE_MINUTE;

// 各層限流的預設上限（同一來源位址）。只能由程式（測試）調整，不讀取請求或環境變數。
const LIMITS = Object.freeze({
  // 註冊次數、登入失敗次數：15 分鐘
  AUTH: 20,
  // 登入總次數（成功與失敗都算）：15 分鐘
  LOGIN_TOTAL: 60,
  // /api/v1 全部路由：1 分鐘
  API: 300,
});

function createRateLimiter({ windowMs, limit, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => sendFailed(res, 429, '嘗試次數過多，請稍後再試'),
  });
}

// 註冊與登入的限流：同一來源 15 分鐘內的次數上限。
// skipSuccessfulRequests 為 true 時只計算失敗的請求（登入用，避免正常使用者連續登入被擋）。
function createAuthRateLimiter(limit = LIMITS.AUTH, { skipSuccessfulRequests = false } = {}) {
  return createRateLimiter({ windowMs: FIFTEEN_MINUTES, limit, skipSuccessfulRequests });
}

// 登入總次數的限流：成功的登入也計入。
// 測試帳號是公開的，只計失敗的話，任何人都能用正確帳密無限次觸發密碼比對（bcrypt）。
function createLoginTotalRateLimiter(limit = LIMITS.LOGIN_TOTAL) {
  return createRateLimiter({ windowMs: FIFTEEN_MINUTES, limit });
}

// 全站限流：同一來源每分鐘對 /api/v1 的請求上限。
function createApiRateLimiter(limit = LIMITS.API) {
  return createRateLimiter({ windowMs: ONE_MINUTE, limit });
}

module.exports = { LIMITS, createAuthRateLimiter, createLoginTotalRateLimiter, createApiRateLimiter };
