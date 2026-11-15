const { Router } = require('express');
const cartController = require('../controllers/cart.controller');
const validate = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const asyncHandler = require('../utils/async-handler');
const { idParamSchema } = require('../validators/common');
const { addCartItemSchema, updateCartItemSchema } = require('../validators/cart.validator');

const router = Router();

// 購物車的所有路由都必須登入
router.use(auth);

router.get('/', asyncHandler(cartController.getCart));
router.post('/items', validate({ body: addCartItemSchema }), asyncHandler(cartController.addItem));
router.patch(
  '/items/:itemId',
  validate({ params: idParamSchema('itemId'), body: updateCartItemSchema }),
  asyncHandler(cartController.updateItem),
);
router.delete(
  '/items/:itemId',
  validate({ params: idParamSchema('itemId') }),
  asyncHandler(cartController.removeItem),
);

module.exports = router;
