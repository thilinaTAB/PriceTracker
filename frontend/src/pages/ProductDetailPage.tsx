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

  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);

  const [priceHistoryLoading, setPriceHistoryLoading] =
    useState<boolean>(false);

  const [priceHistoryError, setPriceHistoryError] = useState<boolean>(false);

  /*
   * Load all product offers belonging to this master product.
   *
   * This is your existing implementation.
   */
  useEffect(() => {
    getProducts().then((data) => {
      // Isolates items belonging to this specific master product variant
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
    if (!user || matchingOffers.length === 0) return;

    const masterProductId = matchingOffers[0].masterProductId;

    if (masterProductId == null) return;

    getWishlist().then((items) => {
      setIsWishlisted(
        items.some((item) => item.masterProductId === masterProductId),
      );
    });
  }, [user, matchingOffers]);

  /*
   * REAL PRICE HISTORY
   *
   * IMPORTANT:
   * React hooks must always run in the same order.
   * Therefore this useEffect is intentionally placed
   * BEFORE the loading / empty-result early returns.
   *
   * Price history belongs to a Product (retailer offer),
   * not directly to the MasterProduct.
   *
   * We therefore select the cheapest available retailer
   * offer and request the history for that real Product ID.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadPriceHistory() {
      if (matchingOffers.length === 0) {
        setPriceHistory([]);
        setPriceHistoryLoading(false);
        setPriceHistoryError(false);
        return;
      }

      /*
       * Use the same availability + price ordering
       * used by the product page.
       */
      const sortedOffers = [...matchingOffers].sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1;
        }

        return a.price - b.price;
      });

      const historyProduct = sortedOffers[0];

      if (!historyProduct?.id) {
        setPriceHistory([]);
        setPriceHistoryLoading(false);
        return;
      }

      setPriceHistoryLoading(true);
      setPriceHistoryError(false);

      try {
        const history = await getPriceHistory(historyProduct.id);

        if (!cancelled) {
          setPriceHistory(history);
        }
      } catch (error) {
        console.error("Failed to load price history:", error);

        if (!cancelled) {
          setPriceHistory([]);
          setPriceHistoryError(true);
        }
      } finally {
        if (!cancelled) {
          setPriceHistoryLoading(false);
        }
      }
    }

    loadPriceHistory();

    return () => {
      cancelled = true;
    };
  }, [matchingOffers]);

  /*
   * Early loading return.
   *
   * All hooks are already declared above this point.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading specifications matrix...
      </div>
    );
  }

  /*
   * Early empty-result return.
   *
   * All hooks are already declared above this point.
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

  // Pick the first match to safely harvest static metadata
  // (brand, name string)
  const masterInfo = matchingOffers[0];

  // Image is picked at random from whichever offers actually have one —
  // don't rely on scrape order, since some shop scrapers (e.g. Chama)
  // don't always capture an image while others do.
  // Falls back to a generic category image if none exist at all.
  const offerImageUrls = matchingOffers
    .map((o) => o.imageUrl)
    .filter((url): url is string => Boolean(url));

  const bestImageUrl =
    offerImageUrls.length > 0
      ? offerImageUrls[0]
      : CATEGORY_IMAGES[masterInfo.subCategory] || "";

  // Available offers are sorted first (by price),
  // out-of-stock offers pushed to the end.
  const sortedOffers = [...matchingOffers].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }

    return a.price - b.price;
  });

  /*
   * The same Product selected for the real history request.
   *
   * sortedOffers already puts available products first,
   * then sorts by price, so the first offer is the
   * cheapest available retailer.
   */
  const historyProduct = sortedOffers[0];

  /*
   * Sort real historical records chronologically.
   */
  const sortedPriceHistory = [...priceHistory].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  /*
   * Convert the real recorded timestamps into chart labels.
   */
  const historyLabels = sortedPriceHistory.map((history) =>
    new Date(history.recordedAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
  );

  /*
   * Extract the actual historical prices.
   */
  const historyPrices = sortedPriceHistory.map((history) => history.price);

  /*
   * The backend records the previous price when a price
   * changes. Therefore the current Product price may not
   * yet exist inside price_history.
   *
   * Add the current real price as the final chart point.
   */
  const hasRealHistory = sortedPriceHistory.length > 0;

  const chartLabels = hasRealHistory
    ? [...historyLabels, "Current"]
    : ["", "", "Current"];

  const chartPrices = hasRealHistory
    ? [...historyPrices, historyProduct.price]
    : [0, historyProduct.price];

  /*
   * REAL chart data.
   *
   * There is NO bestPrice * 1.07,
   * bestPrice * 1.04, etc. anymore.
   */
  const chartConfigData = {
    labels: chartLabels,

    datasets: [
      {
        label: "Market Price (Rs.)",

        data: chartPrices,

        borderColor: "#2563eb",

        backgroundColor: "rgba(37, 99, 235, 0.1)",

        tension: 0.4,

        pointBackgroundColor: "#ffffff",

        pointBorderColor: "#2563eb",

        pointRadius: 4,

        pointHoverRadius: 6,

        fill: true,
      },
    ],
  };

  async function handleWishlistToggle() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (masterInfo.masterProductId == null) return;

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
        {/* Back Link anchor */}
        <Link
          to="/"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors mb-6 inline-block"
        >
          ← Back to Catalog Dashboard
        </Link>

        {/* Master Showcase Row Panel */}
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

        {/* Dynamic Splits Dashboard Container Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Marketplace Comparison Cards (3 Columns Spanning Area) */}
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

          {/* Price Tracking Graph Canvas Panel (2 Columns Spanning Area) */}
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col justify-between h-80">
            <div>
              <h2 className="text-lg font-bold text-white">
                {hasRealHistory
                  ? "Price History Metrics"
                  : "Price Monitoring Preview"}
              </h2>

              <p className="text-xs text-gray-400 mb-4">
                {hasRealHistory
                  ? "Historical price changes for the current best retailer offer"
                  : "Price trend visualization while PricePulse begins monitoring this product"}
              </p>
            </div>

            <div className="flex-1 min-h-0">
              {priceHistoryLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  Loading price history...
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

                    plugins: {
                      legend: {
                        display: false,
                      },

                      tooltip: {
                        callbacks: {
                          label: (context) =>
                            `Rs. ${Number(context.parsed.y).toLocaleString()}`,
                        },
                      },
                    },

                    scales: {
                      x: {
                        grid: {
                          display: false,
                        },

                        ticks: {
                          color: "#9ca3af",

                          font: {
                            size: 10,
                          },
                        },
                      },

                      y: {
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
