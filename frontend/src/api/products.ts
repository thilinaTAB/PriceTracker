import apiClient from "./client";
import type { Product } from "../types";

export function getProducts(isAvailable?: boolean): Promise<Product[]> {
  return apiClient
    .get<
      Product[]
    >("/products", { params: isAvailable !== undefined ? { isAvailable } : {} })
    .then((response) => response.data);
}

export function searchProducts(query: string): Promise<Product[]> {
  return apiClient
    .get<Product[]>("/compare/search", { params: { query } })
    .then((response) => response.data);
}
