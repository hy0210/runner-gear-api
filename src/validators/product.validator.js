const { z } = require('zod');
const { positiveIntString, NO_NUL } = require('./common');

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const listProductsQuerySchema = z.object({
  page: positiveIntString('page').default(1),
  limit: positiveIntString('limit')
    .refine((value) => value <= MAX_PAGE_SIZE, `limit 不可超過 ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
  categoryId: positiveIntString('categoryId').optional(),
  keyword: z.string().trim().max(50, 'keyword 不可超過 50 個字元').refine(...NO_NUL).optional(),
});

const MAX_PRICE = 10_000_000;

// 管理員新增／編輯商品可寫入的欄位（白名單）
const productFields = {
  name: z.string({ error: '請輸入商品名稱' }).trim().min(1, '請輸入商品名稱').max(100, '商品名稱不可超過 100 個字元'),
  description: z.string().trim().max(2000, '商品描述不可超過 2000 個字元'),
  price: z
    .number({ error: '價格必須是數字' })
    .int('價格必須是整數')
    .min(0, '價格不可為負數')
    .max(MAX_PRICE, `價格不可超過 ${MAX_PRICE}`),
  // 只接受 http(s) 網址，擋掉 javascript: 等協定
  imageUrl: z.url({ protocol: /^https?$/, error: '圖片網址必須是 http 或 https 網址' }).max(500, '圖片網址不可超過 500 個字元'),
  categoryId: z
    .number({ error: '請指定分類' })
    .int('分類 id 必須是整數')
    .min(1, '分類 id 必須是正整數')
    .max(2_147_483_647, '分類 id 不合法'),
};

const createProductSchema = z.object({
  ...productFields,
  description: productFields.description.default(''),
});

// 編輯可只送部分欄位，但至少要有一個
const updateProductSchema = z
  .object({
    name: productFields.name.optional(),
    description: productFields.description.optional(),
    price: productFields.price.optional(),
    imageUrl: productFields.imageUrl.optional(),
    categoryId: productFields.categoryId.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), '至少需要提供一個要更新的欄位');

module.exports = { listProductsQuerySchema, createProductSchema, updateProductSchema };
