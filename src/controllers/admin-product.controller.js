const dataSource = require('../config/data-source');
const { Product, Category } = require('../entities');
const AppError = require('../utils/app-error');
const { sendSuccess } = require('../utils/response');
const { toProductView } = require('../utils/product-view');

function productRepository() {
  return dataSource.getRepository(Product);
}

function findProductWithCategory(id) {
  return productRepository().findOne({ where: { id }, relations: { category: true } });
}

async function assertCategoryExists(categoryId) {
  const exists = await dataSource.getRepository(Category).existsBy({ id: categoryId });
  if (!exists) {
    throw new AppError(400, '指定的分類不存在', [{ field: 'categoryId', message: '指定的分類不存在' }]);
  }
}

async function createProduct(req, res) {
  // req.validated.body 只含 validator 允許的欄位
  const { name, description, price, imageUrl, categoryId } = req.validated.body;
  await assertCategoryExists(categoryId);

  const saved = await productRepository().save({ name, description, price, imageUrl, categoryId });
  const product = await findProductWithCategory(saved.id);

  return sendSuccess(res, { product: toProductView(product) }, 201);
}

async function updateProduct(req, res) {
  const { id } = req.validated.params;
  const changes = Object.fromEntries(
    Object.entries(req.validated.body).filter(([, value]) => value !== undefined),
  );

  const existing = await productRepository().findOneBy({ id });
  if (!existing) {
    throw new AppError(404, '找不到這個商品');
  }
  if (changes.categoryId !== undefined) {
    await assertCategoryExists(changes.categoryId);
  }

  await productRepository().update({ id }, changes);
  const product = await findProductWithCategory(id);

  return sendSuccess(res, { product: toProductView(product) });
}

async function deleteProduct(req, res) {
  // 購物車中的相關項目由資料庫的 ON DELETE CASCADE 一併移除
  const result = await productRepository().delete({ id: req.validated.params.id });
  if (!result.affected) {
    throw new AppError(404, '找不到這個商品');
  }
  return res.status(204).end();
}

module.exports = { createProduct, updateProduct, deleteProduct };
