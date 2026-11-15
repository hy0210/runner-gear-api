const { EntitySchema } = require('typeorm');

const Product = new EntitySchema({
  name: 'Product',
  tableName: 'products',
  columns: {
    id: { type: 'integer', primary: true, generated: 'increment', primaryKeyConstraintName: 'pk_products' },
    name: { type: 'varchar', length: 100, nullable: false },
    description: { type: 'text', nullable: false, default: '' },
    // 金額以新台幣「元」的整數儲存
    price: { type: 'integer', nullable: false },
    imageUrl: { name: 'image_url', type: 'varchar', length: 500, nullable: false },
    categoryId: { name: 'category_id', type: 'integer', nullable: false },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
  checks: [{ name: 'ck_products_price', expression: `"price" >= 0` }],
  indices: [{ name: 'idx_products_category_id', columns: ['categoryId'] }],
  relations: {
    category: {
      type: 'many-to-one',
      target: 'Category',
      inverseSide: 'products',
      nullable: false,
      // 分類底下還有商品時不允許刪除分類
      onDelete: 'RESTRICT',
      joinColumn: { name: 'category_id', foreignKeyConstraintName: 'fk_products_category' },
    },
    cartItems: { type: 'one-to-many', target: 'CartItem', inverseSide: 'product' },
  },
});

module.exports = { Product };
