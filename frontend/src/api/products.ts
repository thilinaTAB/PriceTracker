import apiClient from "./client";
import type { Product, PriceHistory } from "../types";

export function getProducts(
  isAvailable?: boolean,
  location?: string,
): Promise<Product[]> {
  const params: Record<string, string | boolean> = {};

  if (isAvailable !== undefined) {
    params.isAvailable = isAvailable;
  }

  if (location) {
    params.location = location;
  }

  return apiClient
    .get<Product[]>("/products", { params })
    .then((response) => response.data);
}

export function searchProducts(query: string): Promise<Product[]> {
  return apiClient
    .get<Product[]>("/compare/search", { params: { query } })
    .then((response) => response.data);
}

export function getPriceHistory(productId: number): Promise<PriceHistory[]> {
  return apiClient
    .get<PriceHistory[]>(`/products/${productId}/history`)
    .then((response) => response.data);
}

export function updateProduct(
  id: number,
  data: {
    name: string;
    brand: string | null;
    modelNumber: string | null;
    variantValue: string | null;
    sku: string | null;
    description: string | null;
    price: number;
    previousPrice: number | null;
    imageUrl: string | null;
    sourceUrl: string;
    category: string;
    subCategory: string;
    isPromotion: boolean;
    isAvailable: boolean;
    shopId: number;
  },
): Promise<Product> {
  return apiClient
    .put<Product>(`/products/${id}`, data)
    .then((response) => response.data);
}

export function deleteProduct(id: number): Promise<void> {
  return apiClient.delete(`/products/${id}`).then(() => undefined);
}
