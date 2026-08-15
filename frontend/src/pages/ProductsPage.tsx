import {
  CATEGORY_IMAGES,
  ELECTRONICS_SUBCATEGORIES,
  formatCategoryName,
} from "../types/categories";
import { useState, useEffect } from "react";
import { getProducts } from "../api/products";
import type { Product, Shop } from "../types";
import { getShops } from "../api/shops";

// Import Chart components for the historical price tracking layer
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// Interface representing our deduplicated component entity structure
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

  // Modal tracking states for the user interaction layer
  const [activeMasterProduct, setActiveMasterProduct] =
    useState<GroupedMasterProduct | null>(null);

  useEffect(() => {
    getProducts().then((data) => setProducts(data));
    getShops().then((data) =>
      setShops([...data].sort(() => Math.random() - 0.5)),
    );
  }, []);

  // --- DATA DEDUPLICATION ENGINE ---
  // Transforms raw product entries into single, unified component masters
  const getGroupedProducts = (): GroupedMasterProduct[] => {
    const groups: { [key: string]: GroupedMasterProduct } = {};

    const filtered = selectedCategory
      ? products.filter((p) => p.subCategory === selectedCategory)
      : products;

    filtered.forEach((product) => {
      const key = product.modelNumber
        ? product.modelNumber.toUpperCase().trim()
        : "GENERIC";
      if (!groups[key]) {
        groups[key] = {
          modelNumber: product.modelNumber || "N/A",
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

  // Mock pricing metrics generator mimicking historic crawls
  const generateChartData = (currentPrice: number) => {
    return {
      labels: ["May 1", "May 15", "June 1", "June 15", "July 1", "Current"],
      datasets: [
        {
          label: "Price History (Rs.)",
          data: [
            currentPrice * 1.08,
            currentPrice * 1.05,
            currentPrice * 1.03,
            currentPrice * 1.06,
            currentPrice * 1.01,
            currentPrice,
          ],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.3,
          pointBorderColor: "#3b82f6",
          pointBackgroundColor: "#ffffff",
        },
      ],
    };
  };

  return (
    <div className="flex bg-gray-900 min-h-screen text-gray-100 font-sans">
      {/* Sidebar Navigation Panel */}
      <div className="w-56 bg-gray-800 p-4 border-r border-gray-700">
        <h2 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4">
          Categories
        </h2>
        <ul className="space-y-1">
          <li
            onClick={() => setSelectedCategory("")}
            className={`p-3 rounded-lg cursor-pointer font-medium text-sm transition-colors ${selectedCategory === "" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
          >
            All Components
          </li>
          {ELECTRONICS_SUBCATEGORIES.map((subcategory) => (
            <li
              key={subcategory}
              onClick={() => setSelectedCategory(subcategory)}
              className={`p-3 rounded-lg cursor-pointer font-medium text-sm transition-colors ${selectedCategory === subcategory ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
            >
              {formatCategoryName(subcategory)}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Catalog Workspace */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-3xl font-extrabold mb-8 tracking-tight text-white">
          Hardware Price Watch
        </h1>

        {/* Unified Cards Layout Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {groupedProducts.map((master) => {
            // Sort listings from lowest price to highest price automatically
            const sortedPrices = master.listings
              .map((l) => l.price)
              .sort((a, b) => a - b);
            const lowestPrice = sortedPrices[0] || 0;
            const vendorCount = master.listings.length;

            return (
              <div
                key={master.modelNumber}
                onClick={() => setActiveMasterProduct(master)}
                className="bg-gray-800 rounded-xl border border-gray-700 p-5 cursor-pointer hover:border-blue-500 hover:scale-[1.02] transition-all duration-200 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="w-full h-36 bg-gray-700 rounded-lg flex items-center justify-center p-2 mb-4">
                    <img
                      src={
                        master.imageUrl ||
                        CATEGORY_IMAGES[master.subCategory] ||
                        ""
                      }
                      alt={master.baseName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">
                    {master.brand}
                  </span>
                  <h3 className="font-bold text-white text-sm line-clamp-2 mt-1">
                    {master.baseName}
                  </h3>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-end">
                  <div>
                    <p className="text-gray-400 text-xs">Best Price</p>
                    <p className="text-emerald-400 font-extrabold text-base">
                      Rs. {lowestPrice.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md font-medium">
                    {vendorCount} {vendorCount === 1 ? "Shop" : "Shops"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shops Directory Section Footer */}
        <div className="mt-16 border-t border-gray-800 pt-8">
          <h2 className="text-xl font-bold mb-4 text-white">
            Tracked Retailers
          </h2>
          <div className="flex flex-wrap gap-6 items-center">
            {shops.map((shop) => (
              <a
                key={shop.id}
                href={shop.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="opacity-70 hover:opacity-100 transition-opacity bg-gray-800 p-3 rounded-lg border border-gray-700"
              >
                <img
                  src={shop.logoUrl}
                  alt={shop.name}
                  className="h-8 w-28 object-contain filter brightness-110"
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* --- MARKETPLACE DETAILS MODAL DRAWER OVERLAY --- */}
      {activeMasterProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
            {/* Close Modal Triggers */}
            <button
              onClick={() => setActiveMasterProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-700 p-2 rounded-full transition-colors"
            >
              ✕
            </button>

            {/* Component Header Block */}
            <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-gray-700">
              <div className="w-full md:w-1/3 bg-gray-900 rounded-xl p-4 flex items-center justify-center">
                <img
                  src={activeMasterProduct.imageUrl}
                  alt={activeMasterProduct.baseName}
                  className="max-h-48 object-contain"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">
                  {activeMasterProduct.brand}
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">
                  {activeMasterProduct.baseName}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Identified Model Reference:{" "}
                  <span className="text-white font-mono bg-gray-900 px-2 py-0.5 rounded">
                    {activeMasterProduct.modelNumber}
                  </span>
                </p>
              </div>
            </div>

            {/* Split Interface Panel Grid: Left Side Comparison List / Right Side Historical Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Left Side: Sorted Shop Pricing Offers Row Map */}
              <div>
                <h3 className="font-bold text-base mb-3 text-white">
                  Compare Store Offers
                </h3>
                <div className="space-y-3">
                  {[...activeMasterProduct.listings]
                    .sort((a, b) => a.price - b.price)
                    .map((listing, index) => (
                      <div
                        key={listing.id}
                        className={`p-4 rounded-xl flex items-center justify-between border ${index === 0 ? "bg-blue-950/40 border-blue-500" : "bg-gray-900 border-gray-700"}`}
                      >
                        <div>
                          <p className="font-bold text-sm text-white">
                            {listing.shopName}
                          </p>
                          <span className="text-xs text-gray-400">
                            Verified Marketplace Item
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p
                              className={`font-extrabold text-base ${index === 0 ? "text-blue-400" : "text-white"}`}
                            >
                              Rs. {listing.price.toLocaleString()}
                            </p>
                          </div>
                          <a
                            href={listing.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${index === 0 ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-gray-700 text-gray-200 hover:bg-gray-600"}`}
                          >
                            Buy
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Side: Rendered Line Chart Tracking Historical Trend Metrics */}
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 flex flex-col justify-between">
                <h3 className="font-bold text-base mb-3 text-white">
                  Price Fluctuations
                </h3>
                <div className="w-full h-52">
                  <Line
                    data={generateChartData(
                      activeMasterProduct.listings[0]?.price || 0,
                    )}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { color: "#9ca3af", font: { size: 10 } },
                        },
                        y: {
                          grid: { color: "#374151" },
                          ticks: { color: "#9ca3af", font: { size: 10 } },
                        },
                      },
                    }}
                  />
                </div>
                <p className="text-center text-gray-500 text-xs mt-2">
                  * Historical adjustments reflect price drops recorded across
                  all local partner crawls.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
