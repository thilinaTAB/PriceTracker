import { CATEGORY_IMAGES, ELECTRONICS_SUBCATEGORIES, formatCategoryName } from "../types/categories"
import { useState, useEffect } from "react";
import { getProducts } from "../api/products";
import type { Product } from "../types";

function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    getProducts().then(data => setProducts([...data].sort(() => Math.random() - 0.5)));
  }, [])
  const [selected, setSelected] = useState<string>('');

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-40 bg-gray-800 text-white min-h-screen p-4">
        <h2 className="font-bold text-lg mb-4">Categories</h2>
        <ul>
          <li
  onClick={() => setSelected('')}
  className={`p-3 rounded-lg cursor-pointer ${selected === '' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
  All
</li>
          {ELECTRONICS_SUBCATEGORIES.map((subcategory) => (
            <li
            onClick={() => setSelected(subcategory)}
              key={subcategory}
             className={`p-3 rounded-lg cursor-pointer ${selected === subcategory ? 'bg-blue-900' : 'hover:bg-gray-700'}`}>
              {formatCategoryName(subcategory)}
            </li>
          ))}
        </ul>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Featured Products</h1>
        <div className="grid grid-cols-4 gap-4">
  {(selected ? products.filter(p => p.subCategory === selected) : products.slice(0, 8)).map(product => (
    <div key={product.id} className="bg-white rounded-lg shadow p-4">
      <img
        src={product.imageUrl ?? CATEGORY_IMAGES[product.subCategory] ?? ''}
        alt={product.name}
        className="w-full h-40 object-contain mb-3"
      />
      <p className="font-semibold text-sm">{product.name}</p>
      <p className="text-blue-600 font-bold mt-1">Rs. {product.price}</p>
      <p className="text-gray-500 text-xs">{product.shopName}</p>
    </div>
  ))}
</div>
      </div>
    </div>
  )
}

export default DashboardPage