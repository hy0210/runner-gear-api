const { EntitySchema } = require('typeorm');

const CartItem = new EntitySchema({
  name: 'CartItem',
  tableName: 'cart_items',
  columns: {
    id: { type: 'integer', primary: true, generated: 'increment', primaryKeyConstraintName: 'pk_cart_items' },
    userId: { name: 'user_id', type: 'integer', nullable: false },
    productId: { name: 'product_id', type: 'integer', nullable: false },
    quantity: { type: 'integer', nullable: false },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
  // 同一會員的同一商品只有一筆，重複加入時累加數量
  uniques: [{ name: 'uq_cart_items_user_product', columns: ['userId', 'productId'] }],
  checks: [{ name: 'ck_cart_items_quantity', expression: `"quantity" >= 1` }],
  indices: [{ name: 'idx_cart_items_product_id', columns: ['productId'] }],
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      inverseSide: 'cartItems',
      nullable: false,
      onDelete: 'CASCADE',
      joinColumn: { name: 'user_id', foreignKeyConstraintName: 'fk_cart_items_user' },
    },
    product: {
      type: 'many-to-one',
      target: 'Product',
      inverseSide: 'cartItems',
      nullable: false,
      // 商品被刪除時，購物車中的該項目一併刪除
      onDelete: 'CASCADE',
      joinColumn: { name: 'product_id', foreignKeyConstraintName: 'fk_cart_items_product' },
    },
  },
});

module.exports = { CartItem };
