const { z } = require('zod');
const { positiveIntString } = require('./common');

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const listProductsQuerySchema = z.object({
  page: positiveIntString('page').default(1),
  limit: positiveIntString('limit')
    .refine((value) => value <= MAX_PAGE_SIZE, `limit 不可超過 ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
  categoryId: positiveIntString('categoryId').optional(),
  keyword: z.string().trim().max(50, 'keyword 不可超過 50 個字元').optional(),
});

module.exports = { listProductsQuerySchema };
