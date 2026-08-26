import {
  CATEGORY_IMAGES,
  ELECTRONICS_SUBCATEGORIES,
  formatCategoryName,
} from "../types/categories";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api/products";
import type { Product, Shop } from "../types";
import { getShops } from "../api/shops";

interface GroupedMasterProduct {
  masterProductId: number;
  modelNumber: string;
  variantValue: string | null;
  brand: string;
  subCategory: string;
  imageUrl: string;
  baseName: string;
  listings: Product[];
}

const PAGE_SIZE = 12;

// Groups raw product listings by master product and uses the first available
// listing image as the group's representative image.
function buildGroupedProducts(productList: Product[]): GroupedMasterProduct[] {
  const groups: {
    [key: string]: Omit<GroupedMasterProduct, "imageUrl"> & {
      imageUrls: string[];
    };
  } = {};

  productList.forEach((product) => {
    if (!product.modelNumber) return;

    const key =
      product.masterProductId != null
        ? String(product.masterProductId)
        : `${product.modelNumber.trim().toUpperCase()}|${
            product.variantValue?.trim().toUpperCase() || ""
          }`;

    if (!groups[key]) {
      groups[key] = {
        masterProductId: product.masterProductId ?? -1,
        modelNumber: product.modelNumber,
        variantValue: product.variantValue,
        brand: product.brand || "Generic",
        subCategory: product.subCategory,
        baseName: product.name,
        listings: [],
        imageUrls: [],
      };
    }

    if (product.imageUrl) {
      groups[key].imageUrls.push(product.imageUrl);
    }

    groups[key].listings.push(product);
  });

  return Object.values(groups).map(({ imageUrls, ...group }) => ({
    ...group,
    imageUrl:
      imageUrls.length > 0
        ? imageUrls[0]
        : CATEGORY_IMAGES[group.subCategory] || "",
  }));
}

function getBestDealPrice(product: GroupedMasterProduct): number {
  const availableListings = product.listings.filter(
    (listing) => listing.isAvailable,
  );

  const pricePool =
    availableListings.length > 0 ? availableListings : product.listings;

  const prices = pricePool
    .map((listing) => listing.price)
    .filter((price) => typeof price === "number");

  return prices.length > 0 ? Math.min(...prices) : 0;
}

function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [prevCategory, setPrevCategory] = useState<string>(selectedCategory);

  // Filter state
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    getProducts().then((data) => setProducts(data));

    getShops().then((data) => setShops(data));
  }, []);

  function toggleBrand(brand: string) {
    setCurrentPage(1);

    setSelectedBrands((current) =>
      current.includes(brand)
        ? current.filter((item) => item !== brand)
        : [...current, brand],
    );
  }

  function toggleVariant(variant: string) {
    setCurrentPage(1);

    setSelectedVariants((current) =>
      current.includes(variant)
        ? current.filter((item) => item !== variant)
        : [...current, variant],
    );
  }

  function clearFilters() {
    setCurrentPage(1);
    setMinPrice("");
    setMaxPrice("");
    setSelectedBrands([]);
    setSelectedVariants([]);
    setInStockOnly(false);
  }

  // Reset back to page 1 whenever the category filter changes.
  // Adjusting state during render (not in an effect) avoids the extra render pass.
  if (selectedCategory !== prevCategory) {
    setPrevCategory(selectedCategory);
    setCurrentPage(1);
  }

  const isHomeTab = selectedCategory === "";

  // Groups raw products (all categories) by model number — base for the Home tab
  const allGroupedProducts = useMemo(
    () => buildGroupedProducts(products),
    [products],
  );

  // Groups raw products filtered to the selected category — base for category tabs
  const categoryGroupedProducts = useMemo(() => {
    if (!selectedCategory) return [];

    return buildGroupedProducts(
      products.filter((p) => p.subCategory === selectedCategory),
    );
  }, [products, selectedCategory]);

  // Products available for generating filter options.
  const filterSourceProducts = useMemo(() => {
    if (!selectedCategory) {
      return products;
    }

    return products.filter(
      (product) => product.subCategory === selectedCategory,
    );
  }, [products, selectedCategory]);

  // Dynamic brand options.
  const availableBrands = useMemo(() => {
    return Array.from(
      new Set(
        filterSourceProducts
          .map((product) => product.brand?.trim())
          .filter((brand): brand is string => Boolean(brand)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [filterSourceProducts]);

  // Dynamic specification / variant options.
  const availableVariants = useMemo(() => {
    return Array.from(
      new Set(
        filterSourceProducts
          .map((product) => product.variantValue?.trim())
          .filter((variant): variant is string => Boolean(variant)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [filterSourceProducts]);

  // Apply filters after grouping the products.
  //
  // This is important because the dashboard represents one master product
  // using multiple shop listings.
  const filteredGroupedProducts = useMemo(() => {
    const sourceProducts = isHomeTab
      ? allGroupedProducts
      : categoryGroupedProducts;

    const min = minPrice.trim() === "" ? null : Number(minPrice);

    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    return sourceProducts.filter((product) => {
      const normalizedBrand = product.brand?.trim() || "Generic";

      const normalizedVariant = product.variantValue?.trim() || "";

      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(normalizedBrand);

      const matchesVariant =
        selectedVariants.length === 0 ||
        selectedVariants.includes(normalizedVariant);

      const bestDealPrice = getBestDealPrice(product);

      const matchesMinPrice = min === null || bestDealPrice >= min;

      const matchesMaxPrice = max === null || bestDealPrice <= max;

      const matchesAvailability =
        !inStockOnly || product.listings.some((listing) => listing.isAvailable);

      return (
        matchesBrand &&
        matchesVariant &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesAvailability
      );
    });
  }, [
    allGroupedProducts,
    categoryGroupedProducts,
    isHomeTab,
    minPrice,
    maxPrice,
    inStockOnly,
    selectedBrands,
    selectedVariants,
  ]);

  // Home tab: single page of randomly picked, in-stock-only items.
  // Memoized on the product list itself so it doesn't reshuffle on every render.
  const [randomOrder] = useState(() => Math.random());

  const homeItems = useMemo(() => {
    const availableOnly = filteredGroupedProducts.filter((p) =>
      p.listings.some((l) => l.isAvailable),
    );

    const shuffled = [...availableOnly];

    let seed = Math.floor(randomOrder * 2147483647);

    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;

      const j = seed % (i + 1);

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, PAGE_SIZE);
  }, [filteredGroupedProducts, randomOrder]);

  const totalPages = isHomeTab
    ? 1
    : Math.max(1, Math.ceil(filteredGroupedProducts.length / PAGE_SIZE));

  const pageStart = (currentPage - 1) * PAGE_SIZE;

  const pagedProducts = isHomeTab
    ? homeItems
    : filteredGroupedProducts.slice(pageStart, pageStart + PAGE_SIZE);

  function goToPage(page: number) {
    const clamped = Math.min(Math.max(page, 1), totalPages);

    setCurrentPage(clamped);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="min-h-screen w-full bg-gray-900 text-gray-100 flex">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 flex-shrink-0 bg-gray-800 border-r border-gray-700 p-6 hidden md:block overflow-y-auto">
        {/* FILTERS */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase text-gray-400 tracking-wider">
              Filters
            </h2>

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* PRICE RANGE */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
              Price Range
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={(event) => {
                  setCurrentPage(1);
                  setMinPrice(event.target.value);
                }}
                className="w-full min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />

              <input
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={(event) => {
                  setCurrentPage(1);
                  setMaxPrice(event.target.value);
                }}
                className="w-full min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {!isHomeTab && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Availability
              </h3>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setInStockOnly(event.target.checked);
                  }}
                  className="accent-blue-600"
                />
                In Stock Only
              </label>
            </div>
          )}

          {!isHomeTab && (
            <>
              {/* BRAND */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  Brand
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableBrands.length > 0 ? (
                    availableBrands.map((brand) => (
                      <label
                        key={brand}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="accent-blue-600"
                        />

                        <span className="truncate">{brand}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No brands available</p>
                  )}
                </div>
              </div>
            </>
          )}

          {!isHomeTab &&  (
            <>
              {/* VARIANT / SPECIFICATION */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  Specification
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableVariants.length > 0 ? (
                    availableVariants.map((variant) => (
                      <label
                        key={variant}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVariants.includes(variant)}
                          onChange={() => toggleVariant(variant)}
                          className="accent-blue-600"
                        />

                        <span className="truncate">{variant}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">
                      No specifications available
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* CATEGORIES */}
        <div>
          <h2 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">
            Categories
          </h2>

          <nav className="space-y-1">
            <button
              onClick={() => setSelectedCategory("")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === ""
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              Home
            </button>

            {ELECTRONICS_SUBCATEGORIES.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedCategory(sub)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === sub
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {formatCategoryName(sub)}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-1 min-w-0 p-8 overflow-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Hardware Price Watch
          </h1>

          <p className="text-gray-400 mt-1">
            Real-time local components prices across Sri Lankan retailers
          </p>
        </div>

        {/* NO RESULTS */}
        {pagedProducts.length === 0 && (
          <div className="w-full bg-gray-800 border border-gray-700 rounded-xl p-10 text-center">
            <h2 className="text-lg font-bold text-white">No products found</h2>

            <p className="text-sm text-gray-400 mt-2">
              Try adjusting or clearing your filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* MASTER UNIQUE COMPONENTS GRID VIEW */}
        {pagedProducts.length > 0 && (
          <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pagedProducts.map((product) => {
              // Compute real-time lowest deal value across available listing offers
              const availableListings = product.listings.filter(
                (l) => l.isAvailable,
              );

              const pricePool =
                availableListings.length > 0
                  ? availableListings
                  : product.listings;

              const prices = pricePool
                .map((l) => l.price)
                .sort((a, b) => a - b);

              const absoluteLowest = prices[0] || 0;
              const vendorCount = product.listings.length;
              const availableCount = availableListings.length;

              return (
                <Link
                  key={`${product.masterProductId ?? "legacy"}-${product.modelNumber}-${product.variantValue ?? ""}`}
                  to={
                    product.masterProductId != null
                      ? `/product/${product.masterProductId}`
                      : `/product/${product.modelNumber}`
                  }
                  className="min-w-0 w-full bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-lg flex flex-col justify-between hover:border-blue-500 hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="min-w-0">
                    {/* PRODUCT IMAGE */}
                    <div className="w-full h-40 bg-gray-900 rounded-lg flex items-center justify-center p-4 mb-4 overflow-hidden">
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

                    {/* BRAND */}
                    <span className="block max-w-full truncate text-xs font-bold text-blue-400 uppercase tracking-widest">
                      {product.brand}
                    </span>

                    {/* PRODUCT NAME */}
                    <h3 className="font-bold text-white text-sm line-clamp-2 mt-1 min-h-[40px] break-words overflow-hidden">
                      {product.baseName}
                    </h3>

                    {product.variantValue && (
                      <span className="inline-block mt-2 text-xs font-semibold text-gray-300 bg-gray-700 px-2 py-1 rounded-md">
                        {product.variantValue}
                      </span>
                    )}
                  </div>

                  {/* PRICE / OFFER INFORMATION */}
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-end gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-gray-500 text-2xs uppercase tracking-wider">
                        Best Deal
                      </p>

                      <p className="text-emerald-400 font-black text-base mt-0.5 whitespace-nowrap">
                        Rs. {absoluteLowest.toLocaleString()}
                      </p>
                    </div>

                    <span className="flex-shrink-0 text-xs bg-gray-700 text-gray-300 px-2.5 py-1 rounded-md border border-gray-600 font-medium whitespace-nowrap">
                      {vendorCount} {vendorCount === 1 ? "Offer" : "Offers"}
                    </span>
                  </div>

                  {availableCount === 0 && (
                    <span className="mt-2 inline-block text-2xs font-bold text-red-400 bg-red-950/40 border border-red-800/60 px-2 py-1 rounded-md">
                      Out of Stock
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {!isHomeTab && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  page === currentPage
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        )}

        {/* RETAILER FOOTER PANEL AREA */}
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
      </main>
    </div>
  );
}

export default DashboardPage;
