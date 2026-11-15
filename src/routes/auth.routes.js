const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const asyncHandler = require('../utils/async-handler');
const { createAuthRateLimiter } = require('../middlewares/rate-limit');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

function createAuthRoutes({ authRateLimitMax } = {}) {
  const router = Router();
  // 註冊與登入共用同一個限流計數
  const authLimiter = createAuthRateLimiter(authRateLimitMax);

  router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
  router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
  router.get('/me', auth, authController.getMe);

  return router;
}

module.exports = createAuthRoutes;
