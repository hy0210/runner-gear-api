const { z } = require('zod');

const MAX_QUANTITY = 99;

// 數量必須是 JSON 數字型別的正整數（字串、小數、0、負數都不接受）
const quantity = z
  .number({ error: '數量必須是正整數' })
  .int('數量必須是正整數')
  .min(1, '數量必須是正整數')
  .max(MAX_QUANTITY, `單一商品數量上限為 ${MAX_QUANTITY}`);

// 只接受 productId 與 quantity；不接受 userId，購物車的擁有者一律取自登入身分
const addCartItemSchema = z.object({
  productId: z
    .number({ error: '請指定商品' })
    .int('商品 id 必須是正整數')
    .min(1, '商品 id 必須是正整數')
    .max(2_147_483_647, '商品 id 不合法'),
  quantity,
});

const updateCartItemSchema = z.object({ quantity });

module.exports = { addCartItemSchema, updateCartItemSchema, MAX_QUANTITY };
