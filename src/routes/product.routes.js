const { Router } = require('express');
const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/async-handler');
const { idParamSchema } = require('../validators/common');
const { listProductsQuerySchema } = require('../validators/product.validator');

// 公開的商品瀏覽 API，不需登入
const router = Router();

router.get('/', validate({ query: listProductsQuerySchema }), asyncHandler(productController.listProducts));
router.get('/:id', validate({ params: idParamSchema() }), asyncHandler(productController.getProduct));

module.exports = router;
