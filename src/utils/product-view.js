// 回應中的商品資料一律經過這裡，明確挑選欄位。
function toProductView(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
  };
}

module.exports = { toProductView };
