const { Router } = require('express');
const adminProductController = require('../controllers/admin-product.controller');
const validate = require('../middlewares/validate');
const { auth, requireAdmin } = require('../middlewares/auth');
const asyncHandler = require('../utils/async-handler');
const { idParamSchema } = require('../validators/common');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');

const router = Router();

// 這個 router 底下的所有路由都必須先登入，且角色為管理員
router.use(auth, requireAdmin);

router.post('/products', validate({ body: createProductSchema }), asyncHandler(adminProductController.createProduct));
router.patch(
  '/products/:id',
  validate({ params: idParamSchema(), body: updateProductSchema }),
  asyncHandler(adminProductController.updateProduct),
);
router.delete(
  '/products/:id',
  validate({ params: idParamSchema() }),
  asyncHandler(adminProductController.deleteProduct),
);

module.exports = router;
