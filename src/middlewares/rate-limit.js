const { rateLimit } = require('express-rate-limit');
const { sendFailed } = require('../utils/response');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const DEFAULT_AUTH_LIMIT = 20;

// 註冊與登入的限流：同一來源 15 分鐘內的次數上限。
function createAuthRateLimiter(limit = DEFAULT_AUTH_LIMIT) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => sendFailed(res, 429, '嘗試次數過多，請稍後再試'),
  });
}

module.exports = { createAuthRateLimiter };
