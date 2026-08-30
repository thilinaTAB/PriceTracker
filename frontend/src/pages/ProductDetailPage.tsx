import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, type FormEvent } from "react";
import { getProducts, getPriceHistory, updateProduct } from "../api/products";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../api/wishlist";
import { getShops } from "../api/shops";
import { useAuth } from "../context/useAuth";
import type { Product, PriceHistory, Shop } from "../types";
import { CATEGORY_IMAGES } from "../types/categories";
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

type ProductEditForm = {
  name: string;
  brand: string;
  modelNumber: string;
  variantValue: string;
  sku: string;
  description: string;
  price: string;
  previousPrice: string;
  imageUrl: string;
  sourceUrl: string;
  category: string;
  subCategory: string;
  isPromotion: boolean;
  isAvailable: boolean;
  shopId: string;
};

const emptyEditForm: ProductEditForm = {
  name: "",
  brand: "",
  modelNumber: "",
  variantValue: "",
  sku: "",
  description: "",
  price: "",
  previousPrice: "",
  imageUrl: "",
  sourceUrl: "",
  category: "",
  subCategory: "",
  isPromotion: false,
  isAvailable: true,
  shopId: "",
};

function productToEditForm(product: Product): ProductEditForm {
  return {
    name: product.name,
    brand: product.brand ?? "",
    modelNumber: product.modelNumber ?? "",
    variantValue: product.variantValue ?? "",
    sku: product.sku ?? "",
    description: product.description ?? "",
    price: String(product.price),
    previousPrice:
      product.previousPrice == null ? "" : String(product.previousPrice),
    imageUrl: product.imageUrl ?? "",
    sourceUrl: product.sourceUrl ?? "",
    category: product.category ?? "",
    subCategory: product.subCategory ?? "",
    isPromotion: product.isPromotion,
    isAvailable: product.isAvailable,
    shopId: String(product.shopId),
  };
}

function ProductDetailPage() {
  const { masterProductId } = useParams<{
    masterProductId: string;
  }>();

  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "ROLE_ADMIN";

  const [matchingOffers, setMatchingOffers] = useState<Product[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);

  const [wishlistBusy, setWishlistBusy] = useState<boolean>(false);

  /*
   * Price history is stored separately for
   * every retailer Product.
   *
   * Example:
   *
   * {
   *   101: [...Nanotek history],
   *   205: [...Chama history],
   *   312: [...Another shop history]
   * }
   */
  const [priceHistories, setPriceHistories] = useState<
    Record<number, PriceHistory[]>
  >({});

  const [priceHistoryLoading, setPriceHistoryLoading] =
    useState<boolean>(false);

  const [priceHistoryError, setPriceHistoryError] = useState<boolean>(false);

  /*
   * Stable chart timestamp.
   *
   * We capture this inside an effect rather than
   * calling Date.now() during render.
   */
  const [chartCurrentTime, setChartCurrentTime] = useState<number>(0);

  /*
   * --------------------------------------------------
   * ADMIN EDIT MODAL STATE
   * --------------------------------------------------
   */

  const [editingOffer, setEditingOffer] = useState<Product | null>(null);

  const [editForm, setEditForm] = useState<ProductEditForm>(emptyEditForm);

  const [editSaving, setEditSaving] = useState<boolean>(false);

  const [editError, setEditError] = useState<string | null>(null);

  const [shops, setShops] = useState<Shop[]>([]);

  /*
   * Load all product offers belonging to
   * this master product.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await getProducts();

        if (cancelled) {
          return;
        }

        const filtered = data.filter(
          (p) =>
            p.masterProductId != null &&
            p.masterProductId === Number(masterProductId),
        );

        setMatchingOffers(filtered);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load products:", error);

        if (!cancelled) {
          setMatchingOffers([]);
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [masterProductId]);

  /*
   * Existing wishlist loading.
   */
  useEffect(() => {
    if (!user || matchingOffers.length === 0) {
      return;
    }

    const currentMasterProductId = matchingOffers[0].masterProductId;

    if (currentMasterProductId == null) {
      return;
    }

    getWishlist()
      .then((items) => {
        setIsWishlisted(
          items.some((item) => item.masterProductId === currentMasterProductId),
        );
      })
      .catch((error) => {
        console.error("Failed to load wishlist:", error);
      });
  }, [user, matchingOffers]);

  /*
   * Load shops for the admin edit form.
   *
   * This is only necessary for administrators.
   */
  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let cancelled = false;

    async function loadShops() {
      try {
        const data = await getShops();

        if (!cancelled) {
          setShops(data);
        }
      } catch (error) {
        console.error("Failed to load shops:", error);
      }
    }

    void loadShops();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  /*
   * Load price history for EVERY retailer.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadPriceHistories() {
      if (matchingOffers.length === 0) {
        setPriceHistories({});
        setPriceHistoryLoading(false);
        setPriceHistoryError(false);
        return;
      }

      setPriceHistoryLoading(true);
      setPriceHistoryError(false);

      /*
       * Capture the current chart timestamp
       * inside the effect.
       *
       * This avoids calling Date.now()
       * during React render.
       */
      const currentTime = Date.now();

      setChartCurrentTime(currentTime);

      try {
        const results = await Promise.all(
          matchingOffers.map(async (offer) => {
            try {
              const history = await getPriceHistory(offer.id);

              return {
                productId: offer.id,
                history,
              };
            } catch (error) {
              /*
               * If one retailer's history
               * fails, the other retailers
               * can still appear.
               */
              console.error(
                `Failed to load price history for ${offer.shopName} (${offer.id}):`,
                error,
              );

              return {
                productId: offer.id,
                history: [],
              };
            }
          }),
        );

        if (!cancelled) {
          const historyMap: Record<number, PriceHistory[]> = {};

          results.forEach(({ productId, history }) => {
            historyMap[productId] = history;
          });

          setPriceHistories(historyMap);
        }
      } catch (error) {
        console.error("Failed to load retailer price histories:", error);

        if (!cancelled) {
          setPriceHistories({});
          setPriceHistoryError(true);
        }
      } finally {
        if (!cancelled) {
          setPriceHistoryLoading(false);
        }
      }
    }

    void loadPriceHistories();

    return () => {
      cancelled = true;
    };
  }, [matchingOffers]);

  /*
   * Loading state.
   *
   * All hooks are already declared above.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading specifications matrix...
      </div>
    );
  }

  /*
   * Empty result state.
   */
  if (matchingOffers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p>
          Target hardware reference code not found in current marketplace array
          context.
        </p>

        <Link to="/" className="text-blue-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  /*
   * Master product information.
   */
  const masterInfo = matchingOffers[0];

  /*
   * Product image.
   */
  const offerImageUrls = matchingOffers
    .map((o) => o.imageUrl)
    .filter((url): url is string => Boolean(url));

  const bestImageUrl =
    offerImageUrls.length > 0
      ? offerImageUrls[0]
      : CATEGORY_IMAGES[masterInfo.subCategory] || "";

  /*
   * Available offers are sorted first.
   * Then lowest price first.
   */
  const sortedOffers = [...matchingOffers].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }

    return a.price - b.price;
  });

  /*
   * --------------------------------------------------
   * MULTI-RETAILER PRICE HISTORY
   * --------------------------------------------------
   */

  const chartColors = [
    "#2563eb",
    "#16a34a",
    "#f97316",
    "#a855f7",
    "#e11d48",
    "#0891b2",
    "#ca8a04",
    "#64748b",
  ];

  /*
   * Seven-day visual starting point for
   * retailers without historical data.
   *
   * The PRICE is 0.
   * The X position is simply before the
   * current point so the curve remains visible.
   */
  const previewStartTime = chartCurrentTime - 7 * 24 * 60 * 60 * 1000;

  /*
   * Create one Chart.js dataset
   * for every retailer.
   */
  const retailerDatasets = sortedOffers.map((offer, shopIndex) => {
    const history = priceHistories[offer.id] || [];

    /*
     * Sort history chronologically.
     */
    const sortedHistory = [...history].sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );

    const color = chartColors[shopIndex % chartColors.length];

    /*
     * REAL HISTORY EXISTS
     */
    if (sortedHistory.length > 0) {
      const historyPoints = sortedHistory.map((item) => ({
        x: new Date(item.recordedAt).getTime(),

        y: item.price,
      }));

      /*
       * Current actual price is the final point.
       */
      historyPoints.push({
        x: chartCurrentTime,
        y: offer.price,
      });

      return {
        label: offer.shopName || "Partner Retailer",

        data: historyPoints,

        borderColor: color,

        backgroundColor: "transparent",

        borderWidth: 2,

        tension: 0.4,

        pointBackgroundColor: "#ffffff",

        pointBorderColor: color,

        pointRadius: 3,

        pointHoverRadius: 6,

        fill: false,
      };
    }

    /*
     * NO REAL HISTORY
     *
     * Exactly TWO data points:
     *
     *     0
     *     ↓
     *     current real price
     */
    return {
      label: offer.shopName || "Partner Retailer",

      data: [
        {
          x: previewStartTime,
          y: 0,
        },
        {
          x: chartCurrentTime,
          y: offer.price,
        },
      ],

      borderColor: color,

      backgroundColor: "transparent",

      borderWidth: 2,

      tension: 0.4,

      pointBackgroundColor: "#ffffff",

      pointBorderColor: color,

      /*
       * Hide the 0 point visually.
       * Show only the current price point.
       */
      pointRadius: [0, 4],

      pointHoverRadius: 6,

      fill: false,
    };
  });

  /*
   * Check whether any retailer has
   * real historical records.
   */
  const hasAnyRealHistory = Object.values(priceHistories).some(
    (history) => history.length > 0,
  );

  /*
   * Chart configuration.
   */
  const chartConfigData = {
    datasets: retailerDatasets,
  };

  /*
   * Wishlist toggle.
   */
  async function handleWishlistToggle() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (masterInfo.masterProductId == null) {
      return;
    }

    setWishlistBusy(true);

    try {
      if (isWishlisted) {
        await removeFromWishlist(masterInfo.masterProductId);

        setIsWishlisted(false);
      } else {
        await addToWishlist(masterInfo.masterProductId);

        setIsWishlisted(true);
      }
    } finally {
      setWishlistBusy(false);
    }
  }

  /*
   * --------------------------------------------------
   * ADMIN EDIT FUNCTIONS
   * --------------------------------------------------
   */

  function handleEditOffer(offer: Product) {
    if (!isAdmin) {
      return;
    }

    setEditingOffer(offer);

    setEditForm(productToEditForm(offer));

    setEditError(null);
  }

  function handleCloseEdit() {
    if (editSaving) {
      return;
    }

    setEditingOffer(null);
    setEditForm(emptyEditForm);
    setEditError(null);
  }

  function updateEditField<K extends keyof ProductEditForm>(
    field: K,
    value: ProductEditForm[K],
  ) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingOffer || !isAdmin) {
      return;
    }

    const price = Number(editForm.price);

    if (!Number.isFinite(price) || price < 0) {
      setEditError("Please enter a valid price.");
      return;
    }

    const shopId = Number(editForm.shopId);

    if (!Number.isFinite(shopId) || shopId <= 0) {
      setEditError("Please select a valid shop.");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const updated = await updateProduct(editingOffer.id, {
        name: editForm.name.trim(),

        brand: editForm.brand.trim() || null,

        modelNumber: editForm.modelNumber.trim() || null,

        variantValue: editForm.variantValue.trim() || null,

        sku: editForm.sku.trim() || null,

        description: editForm.description.trim() || null,

        price,

        previousPrice:
          editForm.previousPrice.trim() === ""
            ? null
            : Number(editForm.previousPrice),

        imageUrl: editForm.imageUrl.trim() || null,

        sourceUrl: editForm.sourceUrl.trim(),

        category: editForm.category,

        subCategory: editForm.subCategory,

        isPromotion: editForm.isPromotion,

        isAvailable: editForm.isAvailable,

        shopId,
      });

      /*
       * Replace only the edited retailer offer.
       *
       * Other shop offers remain untouched.
       */
      setMatchingOffers((current) =>
        current.map((offer) => (offer.id === updated.id ? updated : offer)),
      );

      setEditingOffer(null);
      setEditForm(emptyEditForm);
      setEditError(null);
    } catch (error) {
      console.error("Failed to update product:", error);

      setEditError(
        "Unable to update the product. Please check the values and try again.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link
          to="/"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors mb-6 inline-block"
        >
          ← Back to Catalog Dashboard
        </Link>

        {/* Master Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-8 shadow-xl">
          <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-center">
            <img
              src={bestImageUrl || ""}
              alt={masterInfo.name}
              className="max-h-56 object-contain"
            />
          </div>

          <div className="md:col-span-2 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                  {masterInfo.brand}
                </span>

                <h1 className="text-3xl font-extrabold text-white mt-1 mb-2">
                  {masterInfo.name}
                </h1>
              </div>

              <button
                onClick={handleWishlistToggle}
                disabled={wishlistBusy || masterInfo.masterProductId == null}
                title={
                  masterInfo.masterProductId == null
                    ? "This product hasn't been catalogued yet"
                    : undefined
                }
                className={`text-xs font-bold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 ${
                  isWishlisted
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                }`}
              >
                {isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>
            </div>

            <p className="text-gray-400 text-sm">
              Universal SKU Reference String:{" "}
              <span className="font-mono text-white bg-gray-900 px-2 py-0.5 rounded text-xs">
                {masterInfo.modelNumber}
              </span>
              {masterInfo.variantValue && (
                <>
                  <span className="mx-2">•</span>

                  <span className="font-mono text-white bg-gray-900 px-2 py-0.5 rounded text-xs">
                    {masterInfo.variantValue}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Retailer Offers */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-bold mb-4 text-white">
              Available Sri Lankan Retailer Offers
            </h2>

            <div className="space-y-3">
              {sortedOffers.map((offer, index) => (
                <div
                  key={offer.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    !offer.isAvailable
                      ? "bg-gray-800/60 border-gray-700 opacity-60"
                      : index === 0
                        ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/5"
                        : "bg-gray-800 border-gray-700"
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {offer.shopName || "Partner Retailer"}
                    </h3>

                    <span className="text-xs text-gray-400">
                      Verified Integration Crawl Match
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <p
                      className={`font-black text-lg ${
                        index === 0 && offer.isAvailable
                          ? "text-blue-400"
                          : "text-white"
                      }`}
                    >
                      Rs. {offer.price.toLocaleString()}
                    </p>

                    {/* ADMIN EDIT BUTTON */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleEditOffer(offer)}
                        className="text-xs font-bold px-4 py-2.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-500 transition-colors whitespace-nowrap"
                      >
                        Edit
                      </button>
                    )}

                    {offer.isAvailable ? (
                      <a
                        href={offer.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-xs font-bold px-4 py-2.5 rounded-lg transition-colors ${
                          index === 0
                            ? "bg-blue-600 text-white hover:bg-blue-500"
                            : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        }`}
                      >
                        Buy Offer
                      </a>
                    ) : (
                      <span className="text-xs font-bold px-4 py-2.5 rounded-lg bg-gray-900 text-gray-500 border border-gray-700 cursor-not-allowed whitespace-nowrap">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price History Graph */}
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col justify-between h-80">
            <div>
              <h2 className="text-lg font-bold text-white">
                {hasAnyRealHistory
                  ? "Price History Metrics"
                  : "Price Monitoring Preview"}
              </h2>

              <p className="text-xs text-gray-400 mb-4">
                {hasAnyRealHistory
                  ? "Historical price changes across retailers"
                  : "Price trend visualization while PricePulse begins monitoring this product"}
              </p>
            </div>

            <div className="flex-1 min-h-0">
              {priceHistoryLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  Loading retailer price histories...
                </div>
              ) : priceHistoryError ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center">
                  Unable to load price history.
                </div>
              ) : (
                <Line
                  data={chartConfigData}
                  options={{
                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                      mode: "nearest",
                      intersect: false,
                    },

                    plugins: {
                      legend: {
                        display: true,

                        position: "bottom",

                        labels: {
                          color: "#d1d5db",

                          boxWidth: 12,

                          boxHeight: 12,

                          padding: 10,

                          font: {
                            size: 10,
                          },
                        },
                      },

                      tooltip: {
                        callbacks: {
                          label: (context) =>
                            `${context.dataset.label}: Rs. ${Number(
                              context.parsed.y,
                            ).toLocaleString()}`,

                          title: (items) => {
                            if (items.length === 0) {
                              return "";
                            }

                            const timestamp = Number(items[0].parsed.x);

                            if (timestamp === previewStartTime) {
                              return "Start";
                            }

                            return new Date(timestamp).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            );
                          },
                        },
                      },
                    },

                    scales: {
                      x: {
                        type: "linear" as const,

                        grid: {
                          display: false,
                        },

                        ticks: {
                          color: "#9ca3af",

                          font: {
                            size: 10,
                          },

                          maxTicksLimit: 5,

                          callback: (value) => {
                            const timestamp = Number(value);

                            if (timestamp === previewStartTime) {
                              return "Start";
                            }

                            return new Date(timestamp).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            );
                          },
                        },
                      },

                      y: {
                        beginAtZero: true,

                        grid: {
                          color: "#374151",
                        },

                        ticks: {
                          color: "#9ca3af",

                          font: {
                            size: 10,
                          },

                          callback: (value) =>
                            `Rs. ${Number(value).toLocaleString()}`,
                        },
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          ADMIN EDIT MODAL
          ========================================================= */}

      {editingOffer && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm overflow-y-auto p-4"
          onMouseDown={(event) => {
            /*
             * Clicking the dark background closes
             * the modal. Clicking inside the modal
             * itself does not.
             */
            if (event.target === event.currentTarget) {
              handleCloseEdit();
            }
          }}
        >
          <div className="min-h-full flex items-start justify-center py-8">
            <div className="w-full max-w-5xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Edit Product
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Product ID: {editingOffer.id}
                  </p>

                  <p className="text-xs text-blue-400 mt-1">
                    {editingOffer.shopName || "Partner Retailer"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={editSaving}
                  className="text-gray-400 hover:text-white text-3xl leading-none disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              {/* Error */}
              {editError && (
                <div className="mx-6 mt-5 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                  {editError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveEdit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                  {/* Product Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Product Name
                    </label>

                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        updateEditField("name", event.target.value)
                      }
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Brand
                    </label>

                    <input
                      type="text"
                      value={editForm.brand}
                      onChange={(event) =>
                        updateEditField("brand", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Model Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Model Number
                    </label>

                    <input
                      type="text"
                      value={editForm.modelNumber}
                      onChange={(event) =>
                        updateEditField("modelNumber", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Variant */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Variant Value
                    </label>

                    <input
                      type="text"
                      value={editForm.variantValue}
                      onChange={(event) =>
                        updateEditField("variantValue", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      SKU
                    </label>

                    <input
                      type="text"
                      value={editForm.sku}
                      onChange={(event) =>
                        updateEditField("sku", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(event) =>
                        updateEditField("price", event.target.value)
                      }
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Previous Price */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Previous Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.previousPrice}
                      onChange={(event) =>
                        updateEditField("previousPrice", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Category
                    </label>

                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(event) =>
                        updateEditField("category", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Sub Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Sub Category
                    </label>

                    <input
                      type="text"
                      value={editForm.subCategory}
                      onChange={(event) =>
                        updateEditField("subCategory", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Shop */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Shop
                    </label>

                    <select
                      value={editForm.shopId}
                      onChange={(event) =>
                        updateEditField("shopId", event.target.value)
                      }
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    >
                      {shops.length === 0 && (
                        <option value={editForm.shopId}>
                          {editingOffer.shopName}
                        </option>
                      )}

                      {shops.map((shop) => (
                        <option key={shop.id} value={String(shop.id)}>
                          {shop.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Availability */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-full cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isAvailable}
                        onChange={(event) =>
                          updateEditField("isAvailable", event.target.checked)
                        }
                        className="w-4 h-4 accent-blue-600"
                      />

                      <span className="text-sm text-gray-200">Available</span>
                    </label>
                  </div>

                  {/* Promotion */}
                  <div>
                    <label className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-full cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isPromotion}
                        onChange={(event) =>
                          updateEditField("isPromotion", event.target.checked)
                        }
                        className="w-4 h-4 accent-blue-600"
                      />

                      <span className="text-sm text-gray-200">Promotion</span>
                    </label>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Description
                    </label>

                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        updateEditField("description", event.target.value)
                      }
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 resize-y"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Image URL
                    </label>

                    <input
                      type="url"
                      value={editForm.imageUrl}
                      onChange={(event) =>
                        updateEditField("imageUrl", event.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Source URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-400 mb-2 text-center">
                      Source URL
                    </label>

                    <input
                      type="url"
                      value={editForm.sourceUrl}
                      onChange={(event) =>
                        updateEditField("sourceUrl", event.target.value)
                      }
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-7 pt-5 border-t border-gray-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    disabled={editSaving}
                    className="px-5 py-2.5 rounded-lg bg-gray-700 text-gray-200 font-semibold text-sm hover:bg-gray-600 disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-50"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;
