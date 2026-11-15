const { EntitySchema } = require('typeorm');

const Category = new EntitySchema({
  name: 'Category',
  tableName: 'categories',
  columns: {
    id: { type: 'integer', primary: true, generated: 'increment', primaryKeyConstraintName: 'pk_categories' },
    name: { type: 'varchar', length: 50, nullable: false },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
  },
  uniques: [{ name: 'uq_categories_name', columns: ['name'] }],
  relations: {
    products: { type: 'one-to-many', target: 'Product', inverseSide: 'category' },
  },
});

module.exports = { Category };
