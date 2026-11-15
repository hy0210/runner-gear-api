const { Router } = require('express');
const createAuthRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');

// /api/v1 底下的全部路由
function createApiRoutes(options = {}) {
  const router = Router();

  router.use('/auth', createAuthRoutes(options));
  router.use('/products', productRoutes);
  router.use('/categories', categoryRoutes);

  return router;
}

module.exports = createApiRoutes;
