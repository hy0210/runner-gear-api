const { Router } = require('express');
const productController = require('../controllers/product.controller');
const asyncHandler = require('../utils/async-handler');

const router = Router();

router.get('/', asyncHandler(productController.listCategories));

module.exports = router;
