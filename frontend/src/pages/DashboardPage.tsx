import {
  CATEGORY_IMAGES,
  ELECTRONICS_SUBCATEGORIES,
  formatCategoryName,
} from "../types/categories";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api/products";
import type { Product, Shop } from "../types";
import { getShops } from "../api/shops";

interface GroupedMasterProduct {
  modelNumber: string;
  brand: string;
  subCategory: string;
  imageUrl: string;
  baseName: string;
  listings: Product[];
}

function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    getProducts().then((data) => setProducts(data));
    getShops().then((data) =>
      setShops([...data].sort(() => Math.random() - 0.5)),
    );
  }, []);

  // Groups raw products by their model number to prevent duplicates on screen
  const getGroupedProducts = (): GroupedMasterProduct[] => {
    const groups: { [key: string]: GroupedMasterProduct } = {};

    const filtered = selectedCategory
      ? products.filter((p) => p.subCategory === selectedCategory)
      : products;

    filtered.forEach((product) => {
      if (!product.modelNumber) return;

      const key = product.modelNumber.trim().toUpperCase();

      if (!groups[key]) {
        groups[key] = {
          modelNumber: product.modelNumber,
          brand: product.brand || "Generic",
          subCategory: product.subCategory,
          imageUrl: product.imageUrl || "",
          baseName: product.name,
          listings: [],
        };
      }
      groups[key].listings.push(product);
    });

    return Object.values(groups);
  };

  const groupedProducts = getGroupedProducts();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 p-6 hidden md:block">
        <h2 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">
          Categories
        </h2>
        <nav className="space-y-1">
          <button
            onClick={() => setSelectedCategory("")}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedCategory === "" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
          >
            All Components
          </button>
          {ELECTRONICS_SUBCATEGORIES.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedCategory(sub)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedCategory === sub ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
            >
              {formatCategoryName(sub)}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN LAYOUT CANVAS */}
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Hardware Price Watch
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time local components prices across Sri Lankan retailers
          </p>
        </div>

        {/* Master Unique Components Grid View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {groupedProducts.map((product) => {
            // Compute real-time lowest deal value across available listing offers
            const prices = product.listings
              .map((l) => l.price)
              .sort((a, b) => a - b);
            const absoluteLowest = prices[0] || 0;
            const vendorCount = product.listings.length;

            return (
              <Link
                key={product.modelNumber}
                to={`/product/${product.modelNumber}`}
                className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-lg flex flex-col justify-between hover:border-blue-500 hover:scale-[1.02] transition-all duration-200"
              >
                <div>
                  <div className="w-full h-40 bg-gray-900 rounded-lg flex items-center justify-center p-4 mb-4">
                    <img
                      src={
                        product.imageUrl ||
                        CATEGORY_IMAGES[product.subCategory] ||
                        undefined
                      }
                      alt={product.baseName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                    {product.brand}
                  </span>
                  <h3 className="font-bold text-white text-sm line-clamp-2 mt-1 min-h-[40px]">
                    {product.baseName}
                  </h3>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-end">
                  <div>
                    <p className="text-gray-500 text-2xs uppercase tracking-wider">
                      Best Deal
                    </p>
                    <p className="text-emerald-400 font-black text-base mt-0.5">
                      Rs. {absoluteLowest.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-700 text-gray-300 px-2.5 py-1 rounded-md border border-gray-600 font-medium">
                    {vendorCount} {vendorCount === 1 ? "Offer" : "Offers"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* RETAILER FOOTER PANEL AREA - Solves the unused warning cleanly */}
        {shops.length > 0 && (
          <div className="mt-16 border-t border-gray-800 pt-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Monitored Vendors
            </h2>
            <div className="flex flex-wrap gap-4">
              {shops.map((shop) => (
                <a
                  key={shop.id}
                  href={shop.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-gray-800 border border-gray-700 hover:border-gray-600 p-3 rounded-xl transition-all duration-200 flex items-center justify-center"
                >
                  <img
                    src={shop.logoUrl}
                    alt={shop.name}
                    className="h-6 w-24 object-contain brightness-105"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
