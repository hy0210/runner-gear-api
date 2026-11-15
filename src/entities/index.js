const { User, USER_ROLES } = require('./user.entity');
const { Category } = require('./category.entity');
const { Product } = require('./product.entity');
const { CartItem } = require('./cart-item.entity');

module.exports = {
  User,
  Category,
  Product,
  CartItem,
  USER_ROLES,
  entities: [User, Category, Product, CartItem],
};
