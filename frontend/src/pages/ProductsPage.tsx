import { useState, useEffect } from "react";
import { getProducts } from "../api/products";
import type { Product } from "../types";

function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    useEffect(()=> {
        getProducts().then(data => setProducts(data));
    },[])
  return (
  <div>
    <h1>Products</h1>
    {products.map(product => (
      <div key={product.id}>
        <p>{product.name}</p>
        <p>{product.price}</p>
      </div>
    ))}
  </div>
)
}

export default ProductsPage