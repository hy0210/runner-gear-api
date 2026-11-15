const dataSource = require('../config/data-source');
const { Product, Category } = require('../entities');
const AppError = require('../utils/app-error');
const { sendSuccess } = require('../utils/response');
const { toProductView } = require('../utils/product-view');

// 把關鍵字中的 LIKE 萬用字元（%、_）與跳脫字元本身跳脫，讓它們被當成一般字元比對
function escapeLike(keyword) {
  return keyword.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function listProducts(req, res) {
  const { page, limit, categoryId, keyword } = req.validated.query;

  const query = dataSource
    .getRepository(Product)
    .createQueryBuilder('product')
    .leftJoinAndSelect('product.category', 'category')
    .orderBy('product.id', 'ASC')
    .skip((page - 1) * limit)
    .take(limit);

  // 條件一律以參數帶入，不拼接字串
  if (categoryId) {
    query.andWhere('product.categoryId = :categoryId', { categoryId });
  }
  if (keyword) {
    query.andWhere("product.name ILIKE :pattern ESCAPE '\\'", { pattern: `%${escapeLike(keyword)}%` });
  }

  const [products, total] = await query.getManyAndCount();

  return sendSuccess(res, {
    products: products.map(toProductView),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

async function getProduct(req, res) {
  const product = await dataSource.getRepository(Product).findOne({
    where: { id: req.validated.params.id },
    relations: { category: true },
  });
  if (!product) {
    throw new AppError(404, '找不到這個商品');
  }
  return sendSuccess(res, { product: toProductView(product) });
}

async function listCategories(_req, res) {
  const categories = await dataSource.getRepository(Category).find({ order: { id: 'ASC' } });
  return sendSuccess(res, { categories: categories.map(({ id, name }) => ({ id, name })) });
}

module.exports = { listProducts, getProduct, listCategories };
