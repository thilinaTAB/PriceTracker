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
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [prevCategory, setPrevCategory] = useState<string>(selectedCategory);

  // Search
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filter state
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    getShops().then((data) => setShops(data));
  }, []);

  useEffect(() => {
    getProducts(true, selectedLocation).then((data) => {
      setProducts(data);
      setCurrentPage(1);
    });
  }, [selectedLocation]);

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
    setSelectedLocation("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedBrands([]);
    setSelectedVariants([]);
    setInStockOnly(false);
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  // Reset page when category changes.
  if (selectedCategory !== prevCategory) {
    setPrevCategory(selectedCategory);
    setCurrentPage(1);
  }

  const isHomeTab = selectedCategory === "";

  // Groups all products.
  const allGroupedProducts = useMemo(
    () => buildGroupedProducts(products),
    [products],
  );

  // Groups products belonging to selected category.
  const categoryGroupedProducts = useMemo(() => {
    if (!selectedCategory) return [];

    return buildGroupedProducts(
      products.filter((p) => p.subCategory === selectedCategory),
    );
  }, [products, selectedCategory]);

  // Products used for generating filter options.
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

  // Search filtering.
  //
  // Searches across:
  // - Product name
  // - Model number
  // - Brand
  // - Variant value
  const searchFilteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const sourceProducts = isHomeTab
      ? allGroupedProducts
      : categoryGroupedProducts;

    if (!query) {
      return sourceProducts;
    }

    return sourceProducts.filter((product) => {
      const productName = product.baseName?.toLowerCase() || "";
      const modelNumber = product.modelNumber?.toLowerCase() || "";
      const brand = product.brand?.toLowerCase() || "";
      const variant = product.variantValue?.toLowerCase() || "";

      return (
        productName.includes(query) ||
        modelNumber.includes(query) ||
        brand.includes(query) ||
        variant.includes(query)
      );
    });
  }, [searchTerm, isHomeTab, allGroupedProducts, categoryGroupedProducts]);

  // Apply sidebar filters.
  const filteredGroupedProducts = useMemo(() => {
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    return searchFilteredProducts.filter((product) => {
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
    searchFilteredProducts,
    minPrice,
    maxPrice,
    inStockOnly,
    selectedBrands,
    selectedVariants,
  ]);

  // Home tab:
  // - Random products
  // - In-stock only
  // - Must have an actual product image
  //
  // This preserves the previous Home-tab behaviour.
  const [randomOrder] = useState(() => Math.random());

  const homeItems = useMemo(() => {
    const availableWithImages = filteredGroupedProducts.filter(
      (product) =>
        product.listings.some((listing) => listing.isAvailable) &&
        product.listings.some((listing) => Boolean(listing.imageUrl?.trim())),
    );

    const shuffled = [...availableWithImages];

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
    <div className="min-h-screen w-full bg-gray-900 text-gray-100 flex flex-col">
      {/* ========================================================= */}
      {/* DASHBOARD HERO / BRANDING */}
      {/* ========================================================= */}

      <section className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center">
          {/* Logo */}
          <div className="flex justify-center items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12">
              <div className="absolute w-12 h-12 rounded-full border-2 border-blue-500/40" />

              <svg
                viewBox="0 0 48 48"
                className="w-10 h-10 text-blue-500"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3 25H11L15 13L21 35L27 17L31 25H45"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="text-5xl md:text-6xl font-black tracking-tight">
              <span className="text-white">Price</span>
              <span className="text-blue-500">Pulse</span>
            </h1>
          </div>

          <p className="mt-3 text-gray-400 text-sm md:text-base">
            Track Prices. Compare Components. Build Smarter.
          </p>

          {/* SEARCH BAR */}
          <div className="max-w-3xl mx-auto mt-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                  />
                </svg>
              </div>

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search products, brands or model numbers..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-13 pr-5 text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 transition-colors"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {searchTerm.trim() && (
              <p className="text-left text-xs text-gray-500 mt-2 px-1">
                Searching for:{" "}
                <span className="text-gray-300 font-medium">{searchTerm}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================================= */}

      <div className="flex flex-1 w-full">
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

            {/* LOCATION */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Location
              </h3>

              <select
                value={selectedLocation}
                onChange={(event) => {
                  setSelectedLocation(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Locations</option>
                <option value="Colombo">Colombo</option>
                <option value="Kandy">Kandy</option>
              </select>
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
            )}

            {!isHomeTab && (
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
            )}
          </div>

          {/* CATEGORIES */}
          <div>
            <h2 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">
              Categories
            </h2>

            <nav className="space-y-1">
              <button
                type="button"
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
                  type="button"
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

        {/* MAIN PRODUCT AREA */}
        <main className="flex-1 min-w-0 p-6 md:p-8 overflow-hidden">
          {/* PAGE TITLE */}
          <div className="mb-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  {isHomeTab
                    ? searchTerm.trim()
                      ? "Search Results"
                      : "Popular PC Components"
                    : formatCategoryName(selectedCategory)}
                </h2>

                <p className="text-gray-400 mt-1 text-sm">
                  {isHomeTab
                    ? searchTerm.trim()
                      ? "Components matching your search"
                      : "Compare PC component prices across Sri Lankan retailers"
                    : "Compare available retailer offers"}
                </p>
              </div>

              {searchTerm.trim() && (
                <span className="text-xs text-gray-500">
                  {filteredGroupedProducts.length} result
                  {filteredGroupedProducts.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          {/* NO RESULTS */}
          {pagedProducts.length === 0 && (
            <div className="w-full bg-gray-800 border border-gray-700 rounded-xl p-10 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-bold text-white">
                No products found
              </h2>

              <p className="text-sm text-gray-400 mt-2">
                Try a different search term or adjust your filters.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  clearFilters();
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Clear Search & Filters
              </button>
            </div>
          )}

          {/* PRODUCT GRID */}
          {pagedProducts.length > 0 && (
            <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {pagedProducts.map((product) => {
                const availableListings = product.listings.filter(
                  (listing) => listing.isAvailable,
                );

                const pricePool =
                  availableListings.length > 0
                    ? availableListings
                    : product.listings;

                const prices = pricePool
                  .map((listing) => listing.price)
                  .filter((price) => typeof price === "number")
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

          {/* PAGINATION */}
          {!isHomeTab && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    type="button"
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
                ),
              )}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          )}

          {/* ===================================================== */}
          {/* MONITORED SHOPS */}
          {/* ===================================================== */}

          {shops.length > 0 && (
            <section className="mt-16">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Monitored Shops
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Retailers currently monitored by PricePulse
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {shops.map((shop) => (
                  <a
                    key={shop.id}
                    href={shop.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-gray-800 border border-gray-700 hover:border-blue-500 p-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center min-w-[140px] min-h-[88px]"
                  >
                    {shop.logoUrl ? (
                      <img
                        src={shop.logoUrl}
                        alt={shop.name}
                        className="h-7 w-24 object-contain brightness-105"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-300">
                        {shop.name}
                      </span>
                    )}

                    {shop.locations && shop.locations.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <svg
                          className="w-3.5 h-3.5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17.657 16.657L13.414 21.9a1.5 1.5 0 0 1-2.828 0l-4.243-5.243a8 8 0 1 1 11.314 0Z"
                          />
                          <circle cx="12" cy="11" r="2.5" strokeWidth="2" />
                        </svg>

                        <span className="text-[11px] text-gray-500">
                          {shop.locations.join(" • ")}
                        </span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
