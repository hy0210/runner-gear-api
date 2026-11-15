const { Router } = require('express');
const createAuthRoutes = require('./auth.routes');

// /api/v1 底下的全部路由
function createApiRoutes(options = {}) {
  const router = Router();

  router.use('/auth', createAuthRoutes(options));

  return router;
}

module.exports = createApiRoutes;
