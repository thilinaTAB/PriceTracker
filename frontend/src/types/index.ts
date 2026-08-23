export interface Shop {
  id: number;
  name: string;
  websiteUrl: string;
  logoUrl: string;
  active: boolean;
  createdAt: Date;
}

export interface Product {
  id: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
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
  shopName: string;
  masterProductId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistItem {
  id: number;
  masterProductId: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  imageUrl: string | null;
  category: string;
  subCategory: string;
  lowestPrice: number | null;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}