const { Router } = require('express');
const createAuthRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const adminRoutes = require('./admin.routes');
const cartRoutes = require('./cart.routes');

// /api/v1 底下的全部路由
function createApiRoutes(options = {}) {
  const router = Router();

  router.use('/auth', createAuthRoutes(options));
  router.use('/products', productRoutes);
  router.use('/categories', categoryRoutes);
  router.use('/admin', adminRoutes);
  router.use('/cart', cartRoutes);

  return router;
}

module.exports = createApiRoutes;
