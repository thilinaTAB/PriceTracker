import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getWishlist, removeFromWishlist } from "../api/wishlist";
import type { WishlistItem } from "../types";

function WishlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getWishlist().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleRemove(masterProductId: number) {
    await removeFromWishlist(masterProductId);
    setItems((prev) =>
      prev.filter((item) => item.masterProductId !== masterProductId),
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Loading wishlist...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col gap-2">
        <p className="text-gray-500">Your wishlist is empty.</p>
        <Link to="/" className="text-blue-600 underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Wishlist</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 flex flex-col gap-2"
          >
            {item.modelNumber ? (
              <Link to={`/product/${item.modelNumber}`}>
                <img
                  src={item.imageUrl || ""}
                  alt={item.name}
                  className="h-32 w-full object-contain"
                />
                <h3 className="font-semibold text-sm mt-2">{item.name}</h3>
              </Link>
            ) : (
              <>
                <img
                  src={item.imageUrl || ""}
                  alt={item.name}
                  className="h-32 w-full object-contain"
                />
                <h3 className="font-semibold text-sm mt-2">{item.name}</h3>
              </>
            )}
            <p className="text-sm text-gray-600">
              {item.lowestPrice != null
                ? `Rs. ${item.lowestPrice.toLocaleString()}`
                : "No offers available"}
            </p>
            <button
              onClick={() => handleRemove(item.masterProductId)}
              className="text-xs text-red-600 underline mt-auto text-left"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WishlistPage;
