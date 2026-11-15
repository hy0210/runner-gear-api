const dataSource = require('../config/data-source');
const { CartItem, Product } = require('../entities');
const AppError = require('../utils/app-error');
const { sendSuccess } = require('../utils/response');
const { MAX_QUANTITY } = require('../validators/cart.validator');

const PG_FOREIGN_KEY_VIOLATION = '23503';

function cartRepository() {
  return dataSource.getRepository(CartItem);
}

// 讀出指定會員的完整購物車。所有購物車操作最後都回傳這個結果，
// 讓前端永遠以後端的資料為準。
async function loadCart(userId) {
  const items = await cartRepository().find({
    where: { userId },
    relations: { product: true },
    order: { id: 'ASC' },
  });

  const viewItems = items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    subtotal: item.quantity * item.product.price,
    product: {
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      imageUrl: item.product.imageUrl,
    },
  }));

  return {
    items: viewItems,
    totalQuantity: viewItems.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: viewItems.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

async function getCart(req, res) {
  // 擁有者一律取自 auth middleware 驗證過的登入身分
  return sendSuccess(res, { cart: await loadCart(req.user.id) });
}

async function addItem(req, res) {
  const userId = req.user.id;
  const { productId, quantity } = req.validated.body;

  const productExists = await dataSource.getRepository(Product).existsBy({ id: productId });
  if (!productExists) {
    throw new AppError(404, '找不到這個商品');
  }

  // 以單一 SQL 完成「不存在就新增、已存在就累加」，同時送出的請求也不會少算或產生第二筆。
  // 累加後超過上限時不更新，RETURNING 不會有資料。
  let rows;
  try {
    rows = await dataSource.query(
      `INSERT INTO "cart_items" ("user_id", "product_id", "quantity")
       VALUES ($1, $2, $3)
       ON CONFLICT ON CONSTRAINT "uq_cart_items_user_product"
       DO UPDATE SET "quantity" = "cart_items"."quantity" + EXCLUDED."quantity", "updated_at" = now()
       WHERE "cart_items"."quantity" + EXCLUDED."quantity" <= $4
       RETURNING "id"`,
      [userId, productId, quantity, MAX_QUANTITY],
    );
  } catch (error) {
    // 檢查之後商品剛好被刪除
    if ((error?.driverError?.code ?? error?.code) === PG_FOREIGN_KEY_VIOLATION) {
      throw new AppError(404, '找不到這個商品');
    }
    throw error;
  }

  if (rows.length === 0) {
    throw new AppError(400, `單一商品數量上限為 ${MAX_QUANTITY}`, [
      { field: 'quantity', message: `加入後會超過單一商品數量上限 ${MAX_QUANTITY}` },
    ]);
  }

  return sendSuccess(res, { cart: await loadCart(userId) }, 201);
}

async function updateItem(req, res) {
  const userId = req.user.id;
  // 條件同時限定項目 id 與擁有者：別人的項目等同不存在
  const result = await cartRepository().update(
    { id: req.validated.params.itemId, userId },
    { quantity: req.validated.body.quantity },
  );
  if (!result.affected) {
    throw new AppError(404, '找不到這個購物車項目');
  }
  return sendSuccess(res, { cart: await loadCart(userId) });
}

async function removeItem(req, res) {
  const userId = req.user.id;
  const result = await cartRepository().delete({ id: req.validated.params.itemId, userId });
  if (!result.affected) {
    throw new AppError(404, '找不到這個購物車項目');
  }
  return sendSuccess(res, { cart: await loadCart(userId) });
}

module.exports = { getCart, addItem, updateItem, removeItem };
