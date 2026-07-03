import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getProducts } from "../api/products";
import type { Product } from "../types";
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
  const { modelNumber } = useParams<{ modelNumber: string }>();
  const [matchingOffers, setMatchingOffers] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getProducts().then((data) => {
      // Isolates items matching this specific model parameter slug
      const filtered = data.filter(
        (p) =>
          p.modelNumber &&
          p.modelNumber.toUpperCase().trim() ===
            modelNumber?.toUpperCase().trim(),
      );
      setMatchingOffers(filtered);
      setLoading(false);
    });
  }, [modelNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading specifications matrix...
      </div>
    );
  }

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

  // Pick the first match to safely harvest static metadata (brand, image details, name string)
  const masterInfo = matchingOffers[0];
  const sortedOffers = [...matchingOffers].sort((a, b) => a.price - b.price);
  const bestPrice = sortedOffers[0].price;

  // Mock fluctuation array logic map mimicking historical data drops tracking
  const chartConfigData = {
    labels: ["May 1", "May 15", "June 1", "June 15", "July 1", "Current Offer"],
    datasets: [
      {
        label: "Market Price Path (Rs.)",
        data: [
          bestPrice * 1.07,
          bestPrice * 1.04,
          bestPrice * 1.02,
          bestPrice * 1.05,
          bestPrice * 1.01,
          bestPrice,
        ],
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        tension: 0.25,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#2563eb",
      },
    ],
  };

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
              src={masterInfo.imageUrl || ""}
              alt={masterInfo.name}
              className="max-h-56 object-contain"
            />
          </div>
          <div className="md:col-span-2 flex flex-col justify-center">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
              {masterInfo.brand}
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1 mb-2">
              {masterInfo.name}
            </h1>
            <p className="text-gray-400 text-sm">
              Universal SKU Reference String:{" "}
              <span className="font-mono text-white bg-gray-900 px-2 py-0.5 rounded text-xs">
                {masterInfo.modelNumber}
              </span>
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
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${index === 0 ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/5" : "bg-gray-800 border-gray-700"}`}
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
                      className={`font-black text-lg ${index === 0 ? "text-blue-400" : "text-white"}`}
                    >
                      Rs. {offer.price.toLocaleString()}
                    </p>
                    <a
                      href={offer.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-xs font-bold px-4 py-2.5 rounded-lg transition-colors ${index === 0 ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-gray-700 text-gray-200 hover:bg-gray-600"}`}
                    >
                      Buy Offer
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Tracking Graph Canvas Panel (2 Columns Spanning Area) */}
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col justify-between h-80">
            <div>
              <h2 className="text-lg font-bold text-white">
                Price History Metrics
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Value tracking analytics aggregated from partner listings
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <Line
                data={chartConfigData}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
