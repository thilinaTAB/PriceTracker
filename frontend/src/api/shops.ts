import apiClient from "./client";
import type { Shop } from "../types";

export function getShops(): Promise<Shop[]> {
    return apiClient.get<Shop[]>('/shops').then(response => response.data)
}