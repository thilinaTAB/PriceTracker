import { useState } from "react";
import { searchProducts } from "../api/products";
import type { Product } from "../types";

function ComparePage() {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Product[]>([]);

  function handleSearch() {
    searchProducts(query).then(data => setResults(data));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Compare Prices</h1>
      
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a product..."
          className="flex-1 border rounded-lg p-3 text-lg"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-6 rounded-lg">
          Search
        </button>
      </div>

      <div>
        {results.map(product => (
          <div key={product.id} className="border rounded-lg p-4 mb-3">
            <p className="font-semibold">{product.name}</p>
            <p className="text-blue-600 font-bold">Rs. {product.price}</p>
            <p className="text-gray-500 text-sm">{product.shopName}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ComparePage