const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const asyncHandler = require('../utils/async-handler');
const { createAuthRateLimiter } = require('../middlewares/rate-limit');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

function createAuthRoutes({ authRateLimitMax } = {}) {
  const router = Router();
  // 註冊：每次請求都計入；登入：只計入失敗的嘗試（擋暴力猜密碼，不影響正常連續登入）
  const registerLimiter = createAuthRateLimiter(authRateLimitMax);
  const loginLimiter = createAuthRateLimiter(authRateLimitMax, { skipSuccessfulRequests: true });

  router.post('/register', registerLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
  router.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
  router.get('/me', auth, authController.getMe);

  return router;
}

module.exports = createAuthRoutes;
