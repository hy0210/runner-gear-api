const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const asyncHandler = require('../utils/async-handler');
const { createAuthRateLimiter, createLoginTotalRateLimiter } = require('../middlewares/rate-limit');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

function createAuthRoutes({ authRateLimitMax, loginRateLimitMax } = {}) {
  const router = Router();
  // 註冊：每次請求都計入
  const registerLimiter = createAuthRateLimiter(authRateLimitMax);
  // 登入有兩層，都排在輸入驗證與密碼比對之前：
  //   總次數（成功與失敗都算）：擋下以公開的測試帳密反覆登入、消耗運算資源
  //   失敗次數：擋暴力猜密碼，不影響正常的連續登入
  const loginTotalLimiter = createLoginTotalRateLimiter(loginRateLimitMax);
  const loginFailureLimiter = createAuthRateLimiter(authRateLimitMax, { skipSuccessfulRequests: true });

  router.post('/register', registerLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
  router.post(
    '/login',
    loginTotalLimiter,
    loginFailureLimiter,
    validate({ body: loginSchema }),
    asyncHandler(authController.login),
  );
  router.get('/me', auth, authController.getMe);

  return router;
}

module.exports = createAuthRoutes;
