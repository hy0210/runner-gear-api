const { dataSource } = require('./db');
const { Category, Product } = require('../../src/entities');

async function createCategory(name = '跑鞋') {
  return dataSource.getRepository(Category).save({ name });
}

async function createProduct(categoryId, overrides = {}) {
  return dataSource.getRepository(Product).save({
    name: '輕量訓練跑鞋',
    description: '日常訓練用',
    price: 3200,
    imageUrl: 'https://example.com/shoe.png',
    categoryId,
    ...overrides,
  });
}

module.exports = { createCategory, createProduct };
