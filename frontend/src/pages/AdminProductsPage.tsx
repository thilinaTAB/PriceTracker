import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { deleteProduct, getProducts, updateProduct } from "../api/products";
import { getShops } from "../api/shops";
import type { Product, Shop } from "../types";

type ProductForm = {
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

const emptyForm: ProductForm = {
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

function productToForm(product: Product): ProductForm {
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
    sourceUrl: product.sourceUrl,
    category: product.category,
    subCategory: product.subCategory,
    isPromotion: product.isPromotion,
    isAvailable: product.isAvailable,
    shopId: String(product.shopId),
  };
}

function AdminProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [search, setSearch] = useState("");

  // Pagination
  const PRODUCTS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  /*
   * ADMIN ONLY
   */
  const isAdmin = user?.role === "ROLE_ADMIN";

  /*
   * Protect the page on the frontend.
   *
   * Backend authorization remains the
   * actual security layer.
   */
  useEffect(() => {
    if (!user) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    if (!isAdmin) {
      navigate("/", {
        replace: true,
      });
    }
  }, [user, isAdmin, navigate]);

  /*
   * Load products and shops.
   *
   * If the page was opened using:
   *
   * /admin/products?edit=123
   *
   * the requested product is selected after
   * the API response is received.
   */
  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [productData, shopData] = await Promise.all([
          getProducts(),
          getShops(),
        ]);

        setProducts(productData);
        setShops(shopData);

        /*
         * Open the requested product when
         * coming from an admin Edit button.
         *
         * queueMicrotask prevents the state
         * updates from being synchronous inside
         * the effect body.
         */
        const editId = searchParams.get("edit");

        if (editId) {
          const productId = Number(editId);

          if (Number.isFinite(productId)) {
            const product = productData.find((item) => item.id === productId);

            if (product) {
              queueMicrotask(() => {
                setSelectedProduct(product);

                setForm(productToForm(product));

                setError(null);
                setSuccess(null);
              });
            }
          }
        }
      } catch (err) {
        console.error(err);

        setError("Unable to load product management data.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [isAdmin, searchParams]);

  /*
   * Search/filter products.
   */
  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.brand ?? "",
        product.modelNumber ?? "",
        product.shopName,
      ].some((field) => field.toLowerCase().includes(value)),
    );
  }, [products, search]);

  /*
   * Calculate pagination.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );

  /*
   * Keep the current page valid when
   * products are deleted or filtered.
   */
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  /*
   * Reset pagination when search changes.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  /*
   * Products displayed on the current page.
   */
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;

    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  /*
   * Open edit modal.
   */
  function handleEdit(product: Product) {
    setSelectedProduct(product);

    setForm(productToForm(product));

    setError(null);
    setSuccess(null);
  }

  /*
   * Close edit modal.
   */
  function handleCloseEdit() {
    if (saving) {
      return;
    }

    setSelectedProduct(null);
    setForm(emptyForm);
  }

  /*
   * Generic form update.
   */
  function updateField<K extends keyof ProductForm>(
    field: K,
    value: ProductForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /*
   * Save product.
   */
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateProduct(selectedProduct.id, {
        name: form.name.trim(),

        brand: form.brand.trim() || null,

        modelNumber: form.modelNumber.trim() || null,

        variantValue: form.variantValue.trim() || null,

        sku: form.sku.trim() || null,

        description: form.description.trim() || null,

        price: Number(form.price),

        previousPrice:
          form.previousPrice.trim() === "" ? null : Number(form.previousPrice),

        imageUrl: form.imageUrl.trim() || null,

        sourceUrl: form.sourceUrl.trim(),

        category: form.category,

        subCategory: form.subCategory,

        isPromotion: form.isPromotion,

        isAvailable: form.isAvailable,

        shopId: Number(form.shopId),
      });

      /*
       * Update the local product list
       * immediately after successful save.
       */
      setProducts((current) =>
        current.map((product) =>
          product.id === updated.id ? updated : product,
        ),
      );

      setSelectedProduct(null);
      setForm(emptyForm);

      setSuccess("Product updated successfully.");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to update the product. Please check the values and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Delete product.
   */
  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" from PricePulse?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(product.id);
    setError(null);
    setSuccess(null);

    try {
      await deleteProduct(product.id);

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );

      setSuccess("Product deleted successfully.");
    } catch (err) {
      console.error(err);

      setError("Unable to delete the product.");
    } finally {
      setDeletingId(null);
    }
  }

  /*
   * Don't render anything while
   * redirecting non-admin users.
   */
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <Link to="/" className="text-sm text-blue-400 hover:text-blue-300">
              ← Back to Dashboard
            </Link>

            <h1 className="text-3xl font-extrabold mt-3">Product Management</h1>

            <p className="text-gray-400 mt-1">
              Manage PricePulse product information and retailer offers.
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 px-4 py-3">
            <p className="text-xs text-blue-300 uppercase tracking-wider font-bold">
              Administrator
            </p>

            <p className="text-sm text-gray-200 mt-1">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 rounded-lg border border-green-500/40 bg-green-950/40 px-4 py-3 text-sm text-green-300">
            {success}
          </div>
        )}

        {/* Product Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div>
              <h2 className="font-bold text-lg">Products</h2>

              <p className="text-xs text-gray-500 mt-1">
                {filteredProducts.length} product(s)
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, brand, model or shop..."
              className="w-full md:w-96 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No products found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-950 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-5 py-4">Product</th>

                      <th className="px-5 py-4">Shop</th>

                      <th className="px-5 py-4">Price</th>

                      <th className="px-5 py-4">Availability</th>

                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-800">
                    {paginatedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-800/50">
                        {/* Product */}
                        <td className="px-5 py-4 min-w-[320px]">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="w-12 h-12 rounded-lg object-contain bg-gray-800 p-1"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-800" />
                            )}

                            <div>
                              <p className="font-semibold text-white text-sm">
                                {product.name}
                              </p>

                              <p className="text-xs text-gray-500 mt-1">
                                {product.brand}

                                {product.modelNumber &&
                                  ` • ${product.modelNumber}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Shop */}
                        <td className="px-5 py-4 text-sm text-gray-300">
                          {product.shopName}
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4 text-sm font-bold text-white whitespace-nowrap">
                          Rs. {product.price.toLocaleString()}
                        </td>

                        {/* Availability */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              product.isAvailable
                                ? "bg-green-950 text-green-400"
                                : "bg-red-950 text-red-400"
                            }`}
                          >
                            {product.isAvailable ? "Available" : "Out of Stock"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(product)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDelete(product)}
                              disabled={deletingId === product.id}
                              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              {deletingId === product.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-800">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1} –{" "}
                  {Math.min(
                    currentPage * PRODUCTS_PER_PAGE,
                    filteredProducts.length,
                  )}{" "}
                  of {filteredProducts.length} products
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(page - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>

                  <span className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(page + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto my-8 rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Edit Product</h2>

                <p className="text-xs text-gray-500 mt-1">
                  Product ID: {selectedProduct.id}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <label className="md:col-span-2">
                  <span className="admin-label">Product Name</span>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    required
                    className="admin-input"
                  />
                </label>

                {/* Brand */}
                <label>
                  <span className="admin-label">Brand</span>

                  <input
                    value={form.brand}
                    onChange={(event) =>
                      updateField("brand", event.target.value)
                    }
                    className="admin-input"
                  />
                </label>

                {/* Model */}
                <label>
                  <span className="admin-label">Model Number</span>

                  <input
                    value={form.modelNumber}
                    onChange={(event) =>
                      updateField("modelNumber", event.target.value)
                    }
                    className="admin-input"
                  />
                </label>

                {/* Variant */}
                <label>
                  <span className="admin-label">Variant Value</span>

                  <input
                    value={form.variantValue}
                    onChange={(event) =>
                      updateField("variantValue", event.target.value)
                    }
                    className="admin-input"
                  />
                </label>

                {/* SKU */}
                <label>
                  <span className="admin-label">SKU</span>

                  <input
                    value={form.sku}
                    onChange={(event) => updateField("sku", event.target.value)}
                    className="admin-input"
                  />
                </label>

                {/* Price */}
                <label>
                  <span className="admin-label">Price</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      updateField("price", event.target.value)
                    }
                    required
                    className="admin-input"
                  />
                </label>

                {/* Previous Price */}
                <label>
                  <span className="admin-label">Previous Price</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.previousPrice}
                    onChange={(event) =>
                      updateField("previousPrice", event.target.value)
                    }
                    className="admin-input"
                  />
                </label>

                {/* Category */}
                <label>
                  <span className="admin-label">Category</span>

                  <input
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    className="admin-input"
                  />
                </label>

                {/* Sub Category */}
                <label>
                  <span className="admin-label">Sub Category</span>

                  <input
                    value={form.subCategory}
                    onChange={(event) =>
                      updateField("subCategory", event.target.value)
                    }
                    className="admin-input"
                  />
                </label>

                {/* Shop */}
                <label>
                  <span className="admin-label">Shop</span>

                  <select
                    value={form.shopId}
                    onChange={(event) =>
                      updateField("shopId", event.target.value)
                    }
                    required
                    className="admin-input"
                  >
                    <option value="">Select shop</option>

                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Description */}
                <label className="md:col-span-2">
                  <span className="admin-label">Description</span>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={3}
                    className="admin-input"
                  />
                </label>

                {/* Image URL */}
                <label className="md:col-span-2">
                  <span className="admin-label">Image URL</span>

                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) =>
                      updateField("imageUrl", event.target.value)
                    }
                    className="admin-input"
                  />
                </label>

                {/* Product URL */}
                <label className="md:col-span-2">
                  <span className="admin-label">Product URL</span>

                  <input
                    type="url"
                    value={form.sourceUrl}
                    onChange={(event) =>
                      updateField("sourceUrl", event.target.value)
                    }
                    required
                    className="admin-input"
                  />
                </label>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 border-t border-gray-800 pt-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(event) =>
                      updateField("isAvailable", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Available
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.isPromotion}
                    onChange={(event) =>
                      updateField("isPromotion", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Promotion
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-gray-800 pt-5">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={saving}
                  className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold text-gray-200 hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page-local styles */}
      <style>
        {`
          .admin-label {
            display: block;
            font-size: 0.75rem;
            line-height: 1rem;
            font-weight: 600;
            color: rgb(156 163 175);
            margin-bottom: 0.25rem;
          }

          .admin-input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid rgb(55 65 81);
            background: rgb(31 41 55);
            padding: 0.625rem 0.75rem;
            color: white;
            outline: none;
          }

          .admin-input:focus {
            border-color: rgb(59 130 246);
          }
        `}
      </style>
    </div>
  );
}

export default AdminProductsPage;
