import apiClient from "./client";
import type { WishlistItem } from "../types";

export function getWishlist(): Promise<WishlistItem[]> {
  return apiClient
    .get<WishlistItem[]>("/wishlist")
    .then((response) => response.data);
}

export function addToWishlist(masterProductId: number): Promise<WishlistItem> {
  return apiClient
    .post<WishlistItem>(`/wishlist/${masterProductId}`)
    .then((response) => response.data);
}

export function removeFromWishlist(masterProductId: number): Promise<void> {
  return apiClient.delete(`/wishlist/${masterProductId}`).then(() => undefined);
}
