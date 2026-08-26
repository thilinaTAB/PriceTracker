import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getProducts, getPriceHistory } from "../api/products";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../api/wishlist";
import { useAuth } from "../context/useAuth";
import type { Product, PriceHistory } from "../types";
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

function ProductDetailPage() {
  const { masterProductId } = useParams<{ masterProductId: string }>();

  const { user } = useAuth();
  const navigate = useNavigate();

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
   * Load all product offers belonging to
   * this master product.
   */
  useEffect(() => {
    getProducts().then((data) => {
      const filtered = data.filter(
        (p) =>
          p.masterProductId != null &&
          p.masterProductId === Number(masterProductId),
      );

      setMatchingOffers(filtered);
      setLoading(false);
    });
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

    getWishlist().then((items) => {
      setIsWishlisted(
        items.some((item) => item.masterProductId === currentMasterProductId),
      );
    });
  }, [user, matchingOffers]);

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

    loadPriceHistories();

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
    "#2563eb", // Blue
    "#16a34a", // Green
    "#f97316", // Orange
    "#a855f7", // Purple
    "#e11d48", // Red
    "#0891b2", // Cyan
    "#ca8a04", // Yellow
    "#64748b", // Gray
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
     * --------------------------------------------
     * REAL HISTORY EXISTS
     * --------------------------------------------
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
     * --------------------------------------------
     * NO REAL HISTORY
     * --------------------------------------------
     *
     * Exactly TWO data points:
     *
     *     0
     *     ↓
     *     current real price
     *
     * The curve between them is generated
     * by Chart.js tension.
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
                      /*
                       * Show each retailer.
                       */
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

                            /*
                             * Preview starting point.
                             */
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
                      /*
                       * Timestamp-based linear X-axis.
                       *
                       * No date adapter package required.
                       */
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
    </div>
  );
}

export default ProductDetailPage;
